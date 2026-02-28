import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function Layout() {
  return (
    <div className="h-screen flex overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
      <ChatPanel />
    </div>
  )
}
