import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_error`)
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

      return NextResponse.redirect(`${requestUrl.origin}/?verified=true`)
    } catch (error) {
      console.error("Unexpected error in auth callback:", error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=unexpected_error`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/?error=no_code`)
}
