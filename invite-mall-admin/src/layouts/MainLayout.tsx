import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/Layout/Sidebar'
import Header from '@/components/Layout/Header'

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-xhs-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6 min-h-0 bg-xhs-cream">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
