import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTaskList, type TaskItem } from '@/api/task'
import { refundList, type RefundTaskItem } from '@/api/admin'

const typeMap = { invite: '邀请', share: '分享', order: '订单' }
const statusMap = { draft: '草稿', active: '进行中', ended: '已结束' }

type TabType = 'all' | 'pending'

export default function TaskManage() {
  const [tab, setTab] = useState<TabType>('all')
  const [list, setList] = useState<TaskItem[]>([])
  const [total, setTotal] = useState(0)
  const [refundListData, setRefundListData] = useState<RefundTaskItem[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [refundLoading, setRefundLoading] = useState(false)
  const pageSize = 10

  const loadTasks = () => {
    setLoading(true)
    fetchTaskList({ page, pageSize, status: statusFilter || undefined })
      .then((res) => {
        setList(res.list)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  const loadRefundList = () => {
    setRefundLoading(true)
    refundList()
      .then((data) => setRefundListData(Array.isArray(data) ? data : []))
      .catch(() => setRefundListData([]))
      .finally(() => setRefundLoading(false))
  }

  useEffect(() => {
    if (tab === 'all') loadTasks()
  }, [tab, page, statusFilter])

  useEffect(() => {
    if (tab === 'pending') loadRefundList()
  }, [tab])

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">任务管理</h1>
          <p className="text-xhs-gray text-sm mt-1">裂变任务与待审核列表</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-t-card transition-colors ${
            tab === 'all' ? 'bg-white border border-b-0 border-xhs-pink-soft text-xhs-pink -mb-px' : 'text-gray-600 hover:text-xhs-pink'
          }`}
        >
          全部任务
        </button>
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-t-card transition-colors ${
            tab === 'pending' ? 'bg-white border border-b-0 border-xhs-pink-soft text-xhs-pink -mb-px' : 'text-gray-600 hover:text-xhs-pink'
          }`}
        >
          待审核（PENDING_PAYOUT）
        </button>
      </div>

      {tab === 'all' && (
        <>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 rounded-button border border-gray-200 text-sm focus:border-xhs-pink outline-none"
            >
              <option value="">全部状态</option>
              <option value="active">进行中</option>
              <option value="ended">已结束</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div className="grid gap-4">
            {loading ? (
              <div className="bg-white rounded-card p-12 text-center text-xhs-gray border border-xhs-pink-soft">
                加载中...
              </div>
            ) : (
              list.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-card p-5 border border-xhs-pink-soft shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-xhs-gray">
                        <span>类型：{typeMap[t.type]}</span>
                        <span>奖励：{t.reward}</span>
                        <span>目标：{t.target}</span>
                        <span>完成：{t.completed}</span>
                        <span className="font-medium">{statusMap[t.status]}</span>
                      </div>
                      <p className="text-xs text-xhs-gray mt-2">{t.startTime} 至 {t.endTime}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {totalPages > 1 && (
              <div className="flex justify-end gap-2 pt-2">
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
            )}
          </div>
        </>
      )}

      {tab === 'pending' && (
        <div className="grid gap-4">
          {refundLoading ? (
            <div className="bg-white rounded-card p-12 text-center text-xhs-gray border border-xhs-pink-soft">
              加载中...
            </div>
          ) : refundListData.length === 0 ? (
            <div className="bg-white rounded-card p-12 text-center text-xhs-gray border border-xhs-pink-soft">
              暂无待审核任务
            </div>
          ) : (
            refundListData.map((t) => (
              <div
                key={t.taskId}
                className="bg-white rounded-card p-5 border border-xhs-pink-soft shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">任务 {t.taskId}</h3>
                    <p className="text-sm text-xhs-gray mt-1">taskNo: {t.taskNo} · userId: {t.userId} · orderId: {t.orderId}</p>
                    <p className="text-xs text-xhs-gray mt-1">状态: {t.status} · payoutAt: {t.payoutAt ?? '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/tasks/${t.taskId}`}
                      className="px-4 py-2 rounded-button bg-xhs-pink-soft text-xhs-pink text-sm font-medium hover:bg-xhs-pink hover:text-white transition-colors"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
