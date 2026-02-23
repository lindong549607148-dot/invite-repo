import { useEffect, useState } from 'react'
import { fetchUserList, updateUserStatus, type UserItem } from '@/api/user'

const statusMap = { normal: '正常', disabled: '禁用' }

export default function UserManage() {
  const [list, setList] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    fetchUserList({ page, pageSize })
      .then((res) => {
        setList(res.list)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page])

  const toggleStatus = (item: UserItem) => {
    const next = item.status === 'normal' ? 'disabled' : 'normal'
    updateUserStatus(item.id, next).then(() => load())
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">用户管理</h1>
        <p className="text-xhs-gray text-sm mt-1">查看与管理平台用户</p>
      </div>
      <div className="bg-white rounded-card border border-xhs-pink-soft shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-xhs-pink-bg border-b border-xhs-pink-soft">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">用户</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">手机号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">邀请数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">订单数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">注册时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xhs-gray">
                    加载中...
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-xhs-pink-bg/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-800">{u.nickname}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.phone}</td>
                    <td className="py-3 px-4 text-gray-600">{u.inviteCount}</td>
                    <td className="py-3 px-4 text-gray-600">{u.orderCount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          u.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusMap[u.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm">{u.createdAt}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(u)}
                        className="text-sm text-xhs-pink hover:underline"
                      >
                        {u.status === 'normal' ? '禁用' : '启用'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-3 px-4 border-t border-gray-100">
            <span className="text-sm text-xhs-gray">共 {total} 条</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-button border border-gray-200 text-sm disabled:opacity-50 hover:bg-xhs-pink-bg"
              >
                上一页
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-button border border-gray-200 text-sm disabled:opacity-50 hover:bg-xhs-pink-bg"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
