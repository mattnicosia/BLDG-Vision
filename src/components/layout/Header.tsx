import { useAuth } from '@/hooks/useAuth'
import { useOrg } from '@/hooks/useOrg'
import { LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/types'

export function Header() {
  const { user, signOut } = useAuth()
  const { org } = useOrg()
  const email = user?.email ?? ''
  const name = user?.user_metadata?.full_name ?? email.split('@')[0] ?? ''

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        backgroundColor: '#111118',
        borderBottom: '1px solid #1E1E2E',
      }}
    >
      <div className="text-[13px] font-medium" style={{ color: '#7C7C96' }}>
        {org?.region ?? ''}
      </div>
      <div className="flex items-center gap-4">
        <button
          className="relative nav-item rounded-lg p-2"
          style={{ color: '#7C7C96' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E8F0'; e.currentTarget.style.backgroundColor = '#1A1A24' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7C7C96'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <Bell className="h-4 w-4" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: '#6366F1' }}
          />
        </button>
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
          style={{ color: '#4A4A64' }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
