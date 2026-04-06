import { useAuth } from '@/hooks/useAuth'
import { useOrg } from '@/hooks/useOrg'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials, getAvatarColor } from '@/types'

export function Header() {
  const { user, signOut } = useAuth()
  const { org } = useOrg()
  const email = user?.email ?? ''
  const name = user?.user_metadata?.full_name ?? email.split('@')[0] ?? ''
  const colors = getAvatarColor(name)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
      <div className="text-sm text-muted-foreground">
        {org?.region ?? ''}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {name ? getInitials(name) : <User className="h-3 w-3" />}
          </div>
          <span className="text-sm text-foreground">{name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
