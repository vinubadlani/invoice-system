// Test script to check Supabase authentication
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fmmlvfgtgqhswbqziksp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbWx2Zmd0Z3Foc3dicXppa3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTY1ODcsImV4cCI6MjA2ODI3MjU4N30.QsQqFAvJcRSDffBG4zghxvL_2RZ9SHz44qCIMiF_kX4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Authentication error:', error)
    } else {
      console.log('User data:', data)
    }
    
    // Test API access
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .limit(1)
    
    if (businessError) {
      console.error('Database error:', businessError)
    } else {
      console.log('Database access successful, businesses found:', businesses?.length || 0)
    }
    
  } catch (err) {
    console.error('Test failed:', err)
  }
}

testAuth()
