import { useEffect, useState } from 'react'
import { fetchOrderList, type OrderItem } from '@/api/order'

const statusMap: Record<OrderItem['status'], string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

export default function OrderManage() {
  const [list, setList] = useState<OrderItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    fetchOrderList({ page, pageSize })
      .then((res) => {
        setList(res.list)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page])

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">订单管理</h1>
        <p className="text-xhs-gray text-sm mt-1">订单列表与状态</p>
      </div>
      <div className="bg-white rounded-card border border-xhs-pink-soft shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-xhs-pink-bg border-b border-xhs-pink-soft">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">订单号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">用户</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">商品</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">金额</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">下单时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xhs-gray">
                    加载中...
                  </td>
                </tr>
              ) : (
                list.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-xhs-pink-bg/50">
                    <td className="py-3 px-4 font-mono text-sm text-gray-800">{o.orderNo}</td>
                    <td className="py-3 px-4 text-gray-600">{o.userName}</td>
                    <td className="py-3 px-4 text-gray-600">{o.productName}</td>
                    <td className="py-3 px-4 font-medium text-xhs-pink">¥{o.amount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          o.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : o.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-xhs-pink-soft text-xhs-pink'
                        }`}
                      >
                        {statusMap[o.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm">{o.createdAt}</td>
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
