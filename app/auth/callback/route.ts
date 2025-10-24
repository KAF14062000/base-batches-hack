import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  //Getting the code and next url from the search params
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'


  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
  }

  // Prevent open redirects by constraining to same-origin
  let nextUrl: URL
  try {
    nextUrl = new URL(next, origin)
    if (nextUrl.origin !== origin) {
      nextUrl = new URL('/', origin)
    }
  } catch {
    nextUrl = new URL('/auth/auth-code-error', origin)
  }

  return NextResponse.redirect(nextUrl)
}
