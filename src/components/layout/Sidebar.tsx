import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  Kanban,
  Users,
  Send,
  Radar,
  Settings,
} from 'lucide-react'
import { useOrg } from '@/hooks/useOrg'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/opportunities', label: 'Opportunities', icon: Lightbulb },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/relationships', label: 'Relationships', icon: Users },
  { to: '/outreach', label: 'Outreach', icon: Send },
  { to: '/recon', label: 'Recon', icon: Radar },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { org } = useOrg()
  const location = useLocation()

  return (
    <aside
      className="flex w-60 flex-col"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <img
          src="/logo.png"
          alt="bldg vision"
          className="h-20 w-auto object-contain object-left"
        />
      </div>

      {/* Separator */}
      <div className="mx-5 mb-4" style={{ height: '1px', backgroundColor: '#1E1E1E' }} />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium"
              style={{
                backgroundColor: isActive ? '#1C1C1C' : 'transparent',
                color: isActive ? '#E8E8F0' : '#7C7C7C',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#A0A0A0'
                  e.currentTarget.style.backgroundColor = '#121212'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#7C7C7C'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 h-5 w-[3px] rounded-r"
                  style={{ backgroundColor: '#6366F1' }}
                />
              )}
              <item.icon className="h-[18px] w-[18px]" style={{ opacity: isActive ? 1 : 0.6 }} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Org footer */}
      <div className="mx-3 mb-4 mt-auto rounded-lg px-3 py-3" style={{ backgroundColor: '#0A0A0F' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              color: '#ffffff',
            }}
          >
            {org?.name ? org.name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'BV'}
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium" style={{ color: '#E8E8F0' }}>
              {org?.name ?? 'BLDG Vision'}
            </span>
            <span className="text-[10px]" style={{ color: '#4A4A4A' }}>
              {org?.region ?? 'Pro plan'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
