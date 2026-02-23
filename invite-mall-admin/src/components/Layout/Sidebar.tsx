import { NavLink } from 'react-router-dom'

const menus = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/users', label: '用户管理', icon: '👥' },
  { path: '/tasks', label: '任务管理', icon: '📋' },
  { path: '/orders', label: '订单管理', icon: '🛒' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-xhs-pink-soft flex flex-col shadow-card">
      <div className="p-5 border-b border-xhs-pink-soft">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <span className="font-semibold text-gray-800">邀请裂变商城</span>
        </div>
        <p className="text-xs text-xhs-gray mt-1">后台管理</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menus.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-card text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-xhs-pink-soft text-xhs-pink'
                  : 'text-gray-600 hover:bg-xhs-pink-bg hover:text-xhs-pink-light'
              }`
            }
          >
            <span className="text-lg">{m.icon}</span>
            {m.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
