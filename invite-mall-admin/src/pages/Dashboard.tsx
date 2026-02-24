import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats } from '@/api/dashboard'
import type { DashboardStats } from '@/api/dashboard'

const statCards = [
  { key: 'todayUsers', label: '今日新增用户', unit: '人', link: '/users', icon: '👥', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'totalUsers', label: '累计用户', unit: '人', link: '/users', icon: '📊', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'todayOrders', label: '今日订单', unit: '单', link: '/orders', icon: '🛒', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'totalOrders', label: '累计订单', unit: '单', link: '/orders', icon: '📦', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'todayInvites', label: '今日邀请', unit: '次', link: '/tasks', icon: '🎁', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'totalInvites', label: '累计邀请', unit: '次', link: '/tasks', icon: '✨', color: 'bg-xhs-pink-soft text-xhs-pink' },
  { key: 'activeTasks', label: '进行中任务', unit: '个', link: '/tasks', icon: '📋', color: 'bg-xhs-pink-soft text-xhs-pink' },
]

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    fetchDashboardStats().then(setStats)
  }, [])

  return (
    <div className="space-y-6 min-h-[200px]">
      <div>
        <h1 className="text-xl font-bold text-gray-800">仪表盘</h1>
        <p className="text-xhs-gray text-sm mt-1">数据概览与快捷入口</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.key}
            to={card.link}
            className="bg-white rounded-card p-5 border border-xhs-pink-soft shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className={`inline-flex p-2 rounded-button ${card.color} mb-3`}>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p className="text-gray-500 text-sm">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats ? Number(stats[card.key as keyof DashboardStats]) : '--'}
              <span className="text-sm font-normal text-xhs-gray ml-1">{card.unit}</span>
            </p>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-card p-6 border border-xhs-pink-soft shadow-card">
        <h2 className="font-semibold text-gray-800 mb-4">快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/users"
            className="px-4 py-2 rounded-button bg-xhs-pink-soft text-xhs-pink text-sm font-medium hover:bg-xhs-pink hover:text-white transition-colors"
          >
            用户管理
          </Link>
          <Link
            to="/tasks"
            className="px-4 py-2 rounded-button bg-xhs-pink-soft text-xhs-pink text-sm font-medium hover:bg-xhs-pink hover:text-white transition-colors"
          >
            任务管理
          </Link>
          <Link
            to="/orders"
            className="px-4 py-2 rounded-button bg-xhs-pink-soft text-xhs-pink text-sm font-medium hover:bg-xhs-pink hover:text-white transition-colors"
          >
            订单管理
          </Link>
        </div>
      </div>
    </div>
  )
}
