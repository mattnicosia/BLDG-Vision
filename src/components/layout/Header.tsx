import { useAuth } from '@/hooks/useAuth'
import { useOrg } from '@/hooks/useOrg'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/types'
import { NotificationBell } from './NotificationBell'
import { CommandBar } from './CommandBar'

export function Header() {
  const { user, signOut } = useAuth()
  const { org } = useOrg()
  const email = user?.email ?? ''
  const name = user?.user_metadata?.full_name ?? email.split('@')[0] ?? ''

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        backgroundColor: '#141414',
        borderBottom: '1px solid #1E1E1E',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="text-[13px] font-medium" style={{ color: '#7C7C7C' }}>
          {org?.region ?? ''}
        </div>
        <CommandBar />
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              color: '#ffffff',
            }}
          >
            {name ? getInitials(name) : <User className="h-3 w-3" />}
          </div>
          <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
            {name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="nav-item"
          style={{ color: '#4A4A4A' }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
