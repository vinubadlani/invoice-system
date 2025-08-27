import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  // Get the site URL from environment variable or use production domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hisabkitab.store'
  
  // Use production domain for redirects
  const redirectOrigin = process.env.NODE_ENV === 'production' ? siteUrl : requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${redirectOrigin}/?error=auth_error`)
      }

      if (data.user) {
        // Create user profile if it doesn't exist
        const { error: profileError } = await supabase.from("users").upsert([
          {
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || data.user.email!.split("@")[0],
          },
        ])

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }
      }

      // Redirect to dashboard after successful verification
      return NextResponse.redirect(`${redirectOrigin}/dashboard?verified=true`)
    } catch (error) {
      console.error("Unexpected error in auth callback:", error)
      return NextResponse.redirect(`${redirectOrigin}/?error=unexpected_error`)
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/?error=no_code`)
}
