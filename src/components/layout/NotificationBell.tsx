import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Bell, FileText, MapPin, Shield, User, Building2, Check, X } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  read_at?: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  permit: { icon: FileText, color: '#818CF8' },
  board: { icon: Building2, color: '#6366F1' },
  land: { icon: MapPin, color: '#06B6D4' },
  relationship: { icon: User, color: '#F59E0B' },
  competitive: { icon: Shield, color: '#EF4444' },
  info: { icon: Bell, color: '#7C7C7C' },
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NotificationBell() {
  const { org } = useOrg()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read_at).length

  const fetchNotifications = useCallback(async () => {
    if (!org) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }, [org])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read_at).map(n => n.id)
    if (unread.length === 0) return
    for (const id of unread) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    }
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
  }

  async function dismiss(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="nav-item relative rounded-lg p-2"
        style={{ color: open ? '#E8E8F0' : '#7C7C7C', backgroundColor: open ? '#1C1C1C' : 'transparent' }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ backgroundColor: '#6366F1' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-96 rounded-xl page-enter"
          style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#2A2A2A' }}>
            <h3 className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>Alerts</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#6366F1' }}>
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-6 w-6" style={{ color: '#4A4A4A' }} />
                <p className="mt-2 text-[12px]" style={{ color: '#7C7C7C' }}>No alerts yet. Run a scan to generate alerts.</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
                const Icon = config.icon
                const isUnread = !notif.read_at

                return (
                  <div
                    key={notif.id}
                    className="group flex items-start gap-3 border-b px-4 py-3"
                    style={{
                      borderColor: '#2A2A2A',
                      backgroundColor: isUnread ? '#141418' : 'transparent',
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {notif.link ? (
                        <Link
                          to={notif.link}
                          onClick={() => { markRead(notif.id); setOpen(false) }}
                          className="text-[12px] font-medium leading-tight hover:underline"
                          style={{ color: '#E8E8F0' }}
                        >
                          {notif.title}
                        </Link>
                      ) : (
                        <p className="text-[12px] font-medium leading-tight" style={{ color: '#E8E8F0' }}>
                          {notif.title}
                        </p>
                      )}
                      {notif.body && (
                        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#7C7C7C' }}>
                          {notif.body.length > 120 ? notif.body.slice(0, 120) + '...' : notif.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px]" style={{ color: '#4A4A4A' }}>
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(notif.id)}
                      className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100"
                      style={{ color: '#4A4A4A' }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {isUnread && (
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#6366F1' }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
