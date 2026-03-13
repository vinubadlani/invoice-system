import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function for RPC calls with error handling
export const rpcCall = async (functionName, params = {}) => {
  try {
    const { data, error } = await supabase.rpc(functionName, params)
    
    if (error) {
      console.error(`RPC Error (${functionName}):`, error)
      throw error
    }
    
    return { data, error: null }
  } catch (error) {
    console.error(`RPC Exception (${functionName}):`, error)
    return { data: null, error }
  }
}

// Authentication helpers
export const auth = {
  signUp: async (email, password, fullName = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0]
        }
      }
    })
    
    if (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
    }
    
    return { error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Get user error:', error)
    }
    
    return { user, error }
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
    }
    
    return { session, error }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default supabase
