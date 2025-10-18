"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"

const steps = [
  {
    title: "Scan a receipt",
    description: "Upload a receipt and let Qwen3-VL normalize every item, tax, and total.",
  },
  {
    title: "Invite your crew",
    description: "Generate a signed link that travels light—no databases or accounts required.",
  },
  {
    title: "Settle on-chain",
    description: "One tap to settle via the Base Sepolia GroupSplit contract, straight from the browser.",
  },
]

function shorten(address: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""
}

export default function HomePage() {
  const { connect, address, connecting, isConnected } = useWallet()

  const handleConnect = async () => {
    try {
      const account = await connect()
      if (account) {
        toast({ title: "Wallet connected", description: shorten(account) })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect wallet"
      toast({ title: "Wallet error", description: message, variant: "destructive" })
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <section className="grid gap-6 text-center">
        <Badge variant="secondary" className="mx-auto w-fit">
          Base Sepolia · Edge ready
        </Badge>
        <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
          Better Splitwise for Base Sepolia
        </h1>
        <p className="text-muted-foreground">
          OCR receipts with Qwen3-VL, share stateless invites, and settle in a single tap—powered by the Edge
          runtime and ethers v6.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={handleConnect} disabled={connecting} size="lg">
            {isConnected ? `Connected: ${shorten(address)}` : connecting ? "Connecting..." : "Connect wallet"}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/upload">Start with a receipt</Link>
          </Button>
        </div>
      </section>

      <Tabs defaultValue="flow" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-sm">
          <TabsTrigger value="flow">How it works</TabsTrigger>
          <TabsTrigger value="routes">Key routes</TabsTrigger>
        </TabsList>
        <TabsContent value="flow" className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="routes" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Edge-first pages</CardTitle>
              <CardDescription>Navigate the fully client-side experience backed by signed Edge handlers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href="/upload" className="text-sm text-primary hover:underline">
                /upload · OCR &amp; group setup
              </Link>
              <Link href="/join" className="text-sm text-primary hover:underline">
                /join · Claim your items
              </Link>
              <Link href="/settle" className="text-sm text-primary hover:underline">
                /settle · Pay on-chain
              </Link>
              <Link href="/dashboard" className="text-sm text-primary hover:underline">
                /dashboard · Insights &amp; deals
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
