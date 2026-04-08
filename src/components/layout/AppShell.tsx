import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { QuickProfile } from './QuickProfile'

export function AppShell() {
  const [quickProfileOpen, setQuickProfileOpen] = useState(false)

  // Cmd+K / Ctrl+K to open quick profile
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickProfileOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#000000' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-6 page-enter"
          style={{ backgroundColor: '#141414' }}
        >
          <Outlet />
        </main>
      </div>
      <QuickProfile open={quickProfileOpen} onClose={() => setQuickProfileOpen(false)} />
    </div>
  )
}
