import { NextResponse } from "next/server"
import { z } from "zod"

import { chatJSON } from "@/lib/llm"
import { costsSchema, receiptItemSchema } from "@/lib/schemas"

export const runtime = "edge"
export const preferredRegion = "auto"

const requestSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 required"),
  countryCode: z.string().optional(),
  country: z.string().optional(),
})

// Minimal country -> currency mapping for better defaults
function currencyFromCountryCode(countryCode?: string | null): string {
  if (!countryCode) return "Couldn't determine from geoloacation api"
  const cc = countryCode.toUpperCase()
  const EUROZONE = new Set([
    "AT","BE","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES",
  ])
  if (EUROZONE.has(cc)) return "EUR"
  switch (cc) {
    case "IN": return "INR"
    case "US": return "USD"
    case "GB": return "GBP"
    case "AE": return "AED"
    case "SG": return "SGD"
    case "AU": return "AUD"
    case "CA": return "CAD"
    case "JP": return "JPY"
    case "CN": return "CNY"
    case "HK": return "HKD"
    case "NZ": return "NZD"
    case "CH": return "CHF"
    default: return "INR"
  }
}

const systemPromptItems = `You are an OCR assistant that extracts structured data from receipt images.
Task: Extract only line items (name, qty, price, category). Do not include totals, taxes, or any other fields.
Output: Return a single valid JSON object only (no markdown, no prose) with exactly this shape and keys:
{
  "items": [
    {
      "name": "string",
      "qty": 1,
      "price": 0,
      "category": "food|drinks|utilities|transport|entertainment|other"
    }
  ]
}
Rules:
- Numeric fields must be numbers (not strings).
- If a quantity is missing, omit the key.
- Do not include any extra keys or fields.
- Do not wrap the JSON in code fences.
`

const systemPromptTotals = `You are an OCR assistant that extracts structured data from receipt images.
You will be given the list of items separately for context. Extract only the following receipt-level fields and return a single valid JSON object (no markdown, no prose) that matches this exact shape and keys:
{
  "merchant": "",
  "date": "",
  "currency": "INR",
  "subtotal": 0,
  "total": 0,
  "tax": 0,
  "service_charge": 0,
  "sgst": 0,
  "cgst": 0,
  "discount": 0
}
Field rules:
- merchant: string - Name of the merchant (empty string if unknown).
- date: string - ISO date if possible, else raw text (empty string if unknown).
- currency: string - e.g. "INR", "USD".
- subtotal/total/tax/service_charge/sgst/cgst/discount: numbers (non-negative). Use 0 if not found.
Output rules:
- Numeric fields must be numbers (not strings).
- Do not include any extra keys.
- Do not wrap the JSON in code fences.
`



export async function POST(request: Request) {
  type Costs = z.infer<typeof costsSchema>;

  let body: z.infer<typeof requestSchema>
  let itemsList: z.infer<typeof receiptItemSchema>[] = [];
  let totalsResult: Costs = {
                                "merchant": "",
                                "date": "",
                                "currency": "INR",
                                "subtotal": 0,
                                "total": 0,
                                "tax": 0,
                                "service_charge": 0,
                                "sgst": 0,
                                "cgst": 0,
                                "discount": 0
                            };
  
  const itemsEnvelopeSchema = z.object({ items: z.array(receiptItemSchema) });
  type ItemsEnvelope = z.infer<typeof itemsEnvelopeSchema>;

  // Per-step status for UI feedback
  let itemsOk = false
  let itemsError: string | null = null
  let totalsOk = false
  let totalsError: string | null = null


  try {
    body = requestSchema.parse(await request.json())
  } catch(e) {
    console.log("Error parsing request body: ", e);
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  const currencyHint = currencyFromCountryCode(body.countryCode)


  try{

    console.log("Extracting items from receipt");
    const itemsEnvelope : ItemsEnvelope = await chatJSON(itemsEnvelopeSchema, [
      { role: "system", content: systemPromptItems },
      {
        role: "user",
        content: "Extract the structured receipt items from this image. Respond with a JSON object { items: [...] } only.",
        images: [body.imageBase64],
      },
    ])

    itemsList = itemsEnvelope?.items || [];
    itemsOk = true

    console.log("------- Debug Items List ------\n");
    console.log("Items List: ", itemsList);
    console.log("------------------------------\n");

  }catch(error) {
    console.log("Error extracting items from receipt: ", error);
    itemsError = error instanceof Error ? error.message : "Failed to extract items from receipt"
    // proceed with empty items list
  }

  try {
    console.log("Extracting totals, taxes and merchant from receipt");
    const totalsResultConst : Costs = await chatJSON(costsSchema, [
      { role: "system", content: systemPromptTotals },
      { role: "user", content: `Using the following items as context (do not include them in output): ${JSON.stringify(itemsList)}. Country code: ${body.countryCode ?? ''}. If the currency is not explicit on the receipt, assume default currency "${currencyHint}" based on the country. Extract only the specified receipt fields and respond with a single valid JSON object exactly matching the required keys. No extra keys, no markdown, no explanations.`, images: [body.imageBase64] },
    ]);

    // chatJSON already validates against costsSchema, assign directly
    totalsResult = totalsResultConst;
    totalsOk = true
    console.log("Totals Result: ", totalsResult);
 
    

    
  } catch (error) {
    console.log("Error extracting costs from the reciept: ", error);
    totalsError = error instanceof Error ? error.message : "Failed to extract costs from receipt"
  }

  const finalResult = { 
    ...totalsResult , 
    items: itemsList,
    meta: {
      items: { ok: itemsOk, error: itemsError },
      totals: { ok: totalsOk, error: totalsError },
      currency_hint: currencyHint,
    }
  }; 
  return NextResponse.json(finalResult)


}
