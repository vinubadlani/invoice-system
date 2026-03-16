import { getSupabaseClient, supabase } from "./supabase"
import {
	signIn as signInWithPassword,
	signOut as signOutUser,
	signUp as signUpUser,
	getCurrentUser,
} from "./auth"
import { rpcCall } from "./rpc-api"

type AuthResult<T = any> = {
	data: T | null
	error: Error | null
}

const emptySubscription = {
	unsubscribe: () => {
		// Keep backward compatibility when client is unavailable.
	},
}

export const auth = {
	onAuthStateChange(callback: (event: string, session: any) => void) {
		const client = getSupabaseClient()
		if (!client) {
			return { data: { subscription: emptySubscription } }
		}
		return client.auth.onAuthStateChange(callback)
	},

	async getUser(): Promise<{ user: any | null }> {
		const user = await getCurrentUser()
		return { user }
	},

	async signUp(email: string, password: string, fullName: string): Promise<AuthResult<any>> {
		try {
			const data = await signUpUser(email, password, fullName)
			return { data, error: null }
		} catch (error) {
			return { data: null, error: error as Error }
		}
	},

	async signIn(email: string, password: string): Promise<AuthResult<any>> {
		try {
			const data = await signInWithPassword(email, password)
			return { data, error: null }
		} catch (error) {
			return { data: null, error: error as Error }
		}
	},

	async signOut(): Promise<{ error: Error | null }> {
		try {
			await signOutUser()
			return { error: null }
		} catch (error) {
			return { error: error as Error }
		}
	},
}

export { supabase, rpcCall }

export default supabase
