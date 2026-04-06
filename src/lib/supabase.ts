// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: get current user's org_id
export async function getCurrentOrgId(): Promise<string | null> {
  const { data } = await supabase
    .from('org_members')
    .select('org_id')
    .single()
  return data?.org_id ?? null
}

// Helper: get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
