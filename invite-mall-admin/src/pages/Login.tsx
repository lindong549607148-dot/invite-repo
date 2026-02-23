import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/api/auth'

const useMock = import.meta.env.VITE_USE_MOCK === '1'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (useMock) {
      if (!username.trim() || !password.trim()) {
        setError('请输入用户名和密码')
        return
      }
      setLoading(true)
      try {
        const res = await login({ username: username.trim(), password })
        setAuth(res.token, res.user)
        navigate('/dashboard', { replace: true })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '登录失败')
      } finally {
        setLoading(false)
      }
    } else {
      setAuth(username.trim() || 'admin', { name: username.trim() || '管理员' })
      navigate('/dashboard', { replace: true })
    }
  }

  const handleEnterWithKey = () => {
    setAuth('admin', { name: '管理员' })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-xhs-pink-bg via-white to-xhs-cream p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card-hover p-8 border border-xhs-pink-soft">
          <div className="text-center mb-8">
            <span className="text-5xl">🌸</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-3">邀请裂变商城</h1>
            <p className="text-xhs-gray text-sm mt-1">后台管理系统登录</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={useMock ? '请输入用户名' : '可选，用于显示'}
                className="w-full px-4 py-3 rounded-button border border-gray-200 focus:border-xhs-pink focus:ring-2 focus:ring-xhs-pink-soft outline-none transition"
                autoComplete="username"
              />
            </div>
            {useMock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 rounded-button border border-gray-200 focus:border-xhs-pink focus:ring-2 focus:ring-xhs-pink-soft outline-none transition"
                  autoComplete="current-password"
                />
              </div>
            )}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-button">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-button bg-xhs-pink text-white font-medium hover:bg-xhs-rose disabled:opacity-60 transition-colors"
            >
              {useMock ? (loading ? '登录中...' : '登录') : '进入后台'}
            </button>
          </form>
          {!useMock && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-center text-xs text-xhs-gray mb-2">使用 x-admin-key 鉴权，无需真实登录</p>
              <button
                type="button"
                onClick={handleEnterWithKey}
                className="w-full py-3 rounded-button border border-xhs-pink text-xhs-pink font-medium hover:bg-xhs-pink-bg transition-colors"
              >
                继续进入
              </button>
            </div>
          )}
          {useMock && (
            <p className="text-center text-xs text-xhs-gray mt-6">演示：任意用户名与密码即可登录</p>
          )}
        </div>
      </div>
    </div>
  )
}
