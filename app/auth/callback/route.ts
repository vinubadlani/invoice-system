import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  // Get the site URL from environment variable or use production domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hisabkitab.store'
  
  // Use production domain for redirects
  const redirectOrigin = process.env.NODE_ENV === 'production' ? siteUrl : requestUrl.origin

  if (code) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !publicKey) {
      return NextResponse.redirect(`${redirectOrigin}/?error=missing_supabase_env`)
    }

    const cookieStore = await cookies()
    const helpers = (await import("@supabase/auth-helpers-nextjs")) as Record<string, any>

    let supabase: any
    if (typeof helpers.createServerClient === "function") {
      supabase = helpers.createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        publicKey,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet: Array<{ name: string; value: string; options?: any }>) => {
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set(name, value, options)
                } catch {
                  // Route handlers may run in contexts where setting cookies is restricted.
                }
              })
            },
          },
        }
      )
    } else if (typeof helpers.createRouteHandlerClient === "function") {
      supabase = helpers.createRouteHandlerClient({ cookies })
    } else if (typeof helpers.createPagesServerClient === "function") {
      const res = NextResponse.next()
      supabase = helpers.createPagesServerClient(
        { req: request as any, res: res as any },
        {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: publicKey,
        }
      )
    } else {
      throw new Error("No compatible Supabase auth helper client found")
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${redirectOrigin}/?error=auth_error`)
      }

      if (data.user) {
        // Sync profile via RPC to avoid direct table CRUD from app code.
        const { error: profileError } = await supabase.rpc("rpc_sync_user_profile", {
          p_full_name: data.user.user_metadata?.full_name || data.user.email!.split("@")[0],
        })

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
