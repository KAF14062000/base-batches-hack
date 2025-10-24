"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const routes = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/bills", label: "Bills" },
  { href: "/join", label: "Join" },
  { href: "/settle", label: "Settle" },
  { href: "/dashboard", label: "Dashboard" },
]

export function AppHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
      {routes.map((route) => {
        const isActive = pathname === route.href
        return (
          <Button
            key={route.href}
            asChild
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className="justify-start sm:justify-center"
            onClick={onNavigate}
          >
            <Link href={route.href}>{route.label}</Link>
          </Button>
        )
      })}
    </nav>
  )

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Base Splitwise
        </Link>
        <div className="hidden sm:block">
          <NavLinks />
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader className="text-left">
              <SheetTitle>Navigate</SheetTitle>
              <SheetDescription>Select a section to jump to.</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
