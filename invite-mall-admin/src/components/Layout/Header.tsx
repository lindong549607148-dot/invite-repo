import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-xhs-pink-soft flex items-center justify-between px-6 shadow-sm">
      <div className="text-gray-500 text-sm">欢迎使用邀请裂变商城管理后台</div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{user?.name}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 text-sm rounded-button bg-xhs-pink-soft text-xhs-pink hover:bg-xhs-pink hover:text-white transition-colors"
        >
          退出登录
        </button>
      </div>
    </header>
  )
}
