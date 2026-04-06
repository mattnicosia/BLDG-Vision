import { useState, useEffect, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext } from '@/hooks/useAuth'
import { OrgContext } from '@/hooks/useOrg'
import type { Organization, OrgMember } from '@/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Organization | null>(null)
  const [member, setMember] = useState<OrgMember | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  async function fetchOrg(userId: string) {
    setOrgLoading(true)
    const { data: memberData } = await supabase
      .from('org_members')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (memberData) {
      setMember(memberData)
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.org_id)
        .single()
      setOrg(orgData)
    } else {
      setMember(null)
      setOrg(null)
    }
    setOrgLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchOrg(s.user.id)
      } else {
        setOrgLoading(false)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          fetchOrg(s.user.id)
        } else {
          setOrg(null)
          setMember(null)
          setOrgLoading(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setOrg(null)
    setMember(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      <OrgContext.Provider
        value={{
          org,
          member,
          loading: loading || orgLoading,
          refetch: async () => {
            if (user) await fetchOrg(user.id)
          },
        }}
      >
        {children}
      </OrgContext.Provider>
    </AuthContext.Provider>
  )
}
