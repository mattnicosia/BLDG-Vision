import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#000000' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-6 page-enter"
          style={{ backgroundColor: '#111118' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
