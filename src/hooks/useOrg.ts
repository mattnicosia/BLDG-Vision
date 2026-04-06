import { createContext, useContext } from 'react'
import type { Organization, OrgMember } from '@/types'

export interface OrgContextValue {
  org: Organization | null
  member: OrgMember | null
  loading: boolean
  refetch: () => Promise<void>
}

export const OrgContext = createContext<OrgContextValue>({
  org: null,
  member: null,
  loading: true,
  refetch: async () => {},
})

export function useOrg() {
  return useContext(OrgContext)
}
