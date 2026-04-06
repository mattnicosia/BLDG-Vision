import { NavLink, useLocation } from 'react-router-dom'
import {
  Users,
  BookOpen,
  Radar,
  Map,
  Settings,
  Building2,
  Zap,
  Swords,
} from 'lucide-react'
import { useOrg } from '@/hooks/useOrg'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/crm', label: 'Architects', icon: Users },
  { to: '/kb', label: 'Knowledge Base', icon: BookOpen },
  { to: '/radar', label: 'Radar', icon: Radar },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/signals', label: 'Signals', icon: Zap },
  { to: '/competitors', label: 'Competitors', icon: Swords },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { org } = useOrg()
  const location = useLocation()

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: '#0F6E56' }}
        >
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium text-foreground truncate">
          {org?.name ?? 'BLDG Vision'}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
