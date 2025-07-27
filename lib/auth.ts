import { getSupabaseClient } from "./supabase"

export const ADMIN_ACCOUNT = {
  email: "admin@hisabkitaab.com",
  password: "admin123456",
}

export async function signIn(email: string, password: string) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error("Authentication service unavailable")
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  // This check is crucial. If the user is NOT admin and email is not confirmed, sign them out.
  if (data.user && !data.user.email_confirmed_at && email !== ADMIN_ACCOUNT.email) {
    await client.auth.signOut() // This signOut will trigger onAuthStateChange in AuthProvider
    throw new Error("Please confirm your email address before signing in. Check your inbox for a confirmation link.")
  }

  return data
}

export async function signUp(email: string, password: string, fullName: string) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error("Authentication service unavailable")
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error("Authentication service unavailable")
  }

  const { error } = await client.auth.signOut()
  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error("Authentication service unavailable")
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error) {
    throw error
  }
  return user
}
