import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import UserManage from '@/pages/UserManage'
import TaskManage from '@/pages/TaskManage'
import TaskDetail from '@/pages/TaskDetail'
import OrderManage from '@/pages/OrderManage'
import RefundWorkbench from '@/pages/RefundWorkbench'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  if (!hasHydrated) {
    return null
  }
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export const routes = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'users', element: <UserManage /> },
      { path: 'tasks', element: <TaskManage /> },
      { path: 'tasks/:taskId', element: <TaskDetail /> },
      { path: 'orders', element: <OrderManage /> },
      { path: 'workbench/refund', element: <RefundWorkbench /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
