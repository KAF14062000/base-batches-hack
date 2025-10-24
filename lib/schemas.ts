import { Currency } from "lucide-react";
import { z } from "zod"

export const receiptCategorySchema = z.enum([
  "food",
  "drinks",
  "utilities",
  "transport",
  "entertainment",
  "other",
])

export const receiptItemSchema = z.object({
  name: z.string().min(1, "Item name required"),
  qty: z.number().positive().max(9999).optional(),
  price: z.number().nonnegative(),
  category: receiptCategorySchema,
})

export const ocrDocSchema = z.object({
  merchant: z.string().min(1),
  date: z.string().min(1),
  currency: z.string().min(1).max(8).optional().default("INR"),
  items: z.array(receiptItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().optional().default(0),
  service_charge: z.number().nonnegative().optional(),
  sgst: z.number().nonnegative().optional().default(0),
  cgst: z.number().nonnegative().optional().default(0),
  discount: z.number().nonnegative().optional().default(0),
  total: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
})

export const costsSchema = z.object({
  merchant: z.string().optional().default(""),
  date: z.string().optional().default(""),
  currency: z.string().min(1).max(8).default("INR"),
  subtotal: z.coerce.number().nonnegative().optional().default(0),
  total: z.coerce.number().nonnegative().default(0),
  tax: z.coerce.number().nonnegative().optional().default(0),
  service_charge: z.coerce.number().nonnegative().optional().default(0),
  sgst: z.coerce.number().nonnegative().optional().default(0),
  cgst: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
});

export const groupMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  wallet: z.string().min(1),
})

export const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  members: z.array(groupMemberSchema).min(1),
  payerId: z.string().min(1),
})

export const inviteItemSchema = receiptItemSchema.extend({
  id: z.string().min(1),
})

export const invitePayloadSchema = z.object({
  groupId: z.string().min(1),
  expenseId: z.string().min(1),
  groupName: z.string().min(1),
  payerId: z.string().min(1),
  members: z.array(groupMemberSchema),
  expense: ocrDocSchema.extend({
    items: z.array(inviteItemSchema),
  }),
  createdAt: z.string().min(1),
})

export const expenseShareSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().nonnegative(),
})

export const expenseSnapshotSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  groupName: z.string().min(1),
  payerId: z.string().min(1),
  members: z.array(groupMemberSchema),
  expense: ocrDocSchema.extend({
    items: z.array(inviteItemSchema),
  }),
  shares: z.array(expenseShareSchema).optional(),
  createdAt: z.string().min(1),
})

export const expenseHistorySchema = z.array(expenseSnapshotSchema)

export const insightsSchema = z.object({
  findings: z.array(z.string().min(1)).max(5),
  tips: z.array(z.string().min(1)).max(5),
})

export type ReceiptItem = z.infer<typeof receiptItemSchema>
export type OCRDoc = z.infer<typeof ocrDocSchema>
export type GroupMember = z.infer<typeof groupMemberSchema>
export type Group = z.infer<typeof groupSchema>
export type InviteItem = z.infer<typeof inviteItemSchema>
export type InvitePayload = z.infer<typeof invitePayloadSchema>
export type ExpenseShare = z.infer<typeof expenseShareSchema>
export type ExpenseSnapshot = z.infer<typeof expenseSnapshotSchema>
export type Insights = z.infer<typeof insightsSchema>
export type Costs = z.infer<typeof costsSchema>;
export type RecieptItems = z.infer<typeof receiptItemSchema>[];
