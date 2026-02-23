import { useEffect, useState, useCallback } from 'react'
import { refundList, refundApprove, refundReject, type RefundTaskItem } from '@/api/admin'
import { taskDetail, type TaskDetail } from '@/api/taskDetail'

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-700',
}

function formatDate(v: string | number | null | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 19).replace('T', ' ')
  return String(v).slice(0, 19).replace('T', ' ')
}

export default function RefundWorkbench() {
  const [list, setList] = useState<RefundTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const loadList = useCallback(() => {
    setLoading(true)
    refundList()
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch((e) => {
        showToast(e instanceof Error ? e.message : '加载列表失败')
        setList([])
      })
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    loadList()
  }, [loadList])

  const openDetail = (taskId: string) => {
    setDetailTaskId(taskId)
    setDetail(null)
    setNote('')
    setDrawerOpen(true)
    setDetailLoading(true)
    taskDetail(taskId)
      .then(setDetail)
      .catch((e) => {
        showToast(e instanceof Error ? e.message : '加载详情失败')
        setDetail(null)
      })
      .finally(() => setDetailLoading(false))
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setDetailTaskId(null)
    setDetail(null)
    setNote('')
    setSubmitting(false)
  }

  const handleApprove = async () => {
    if (!detailTaskId) return
    const trimmed = note.trim()
    if (!trimmed) {
      showToast('请填写审核备注')
      return
    }
    setSubmitting(true)
    try {
      await refundApprove(detailTaskId, trimmed)
      showToast('审核通过')
      closeDrawer()
      loadList()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!detailTaskId) return
    const trimmed = note.trim()
    if (!trimmed) {
      showToast('请填写拒绝备注')
      return
    }
    setSubmitting(true)
    try {
      await refundReject(detailTaskId, trimmed)
      showToast('已拒绝')
      closeDrawer()
      loadList()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const canOperate = detail?.status === 'PENDING_PAYOUT'
  const riskLevel = detail?.riskLevel ?? ''
  const riskReasons = detail?.riskFlags?.reasons ?? detail?.risk_flags?.reasons ?? []
  const ledger = detail?.ledger

  return (
    <div className="min-h-full bg-[#f7f8fa]" style={{ minHeight: 'calc(100vh - 2rem)' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">审核工作台</h1>
        <p className="text-sm text-xhs-gray mt-1">待审核任务列表，支持通过/拒绝与备注</p>
      </div>

      <div className="bg-white rounded-2xl border border-xhs-pink-soft shadow-[0_2px_12px_rgba(254,44,85,0.08)] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xhs-gray">暂无待审核任务</p>
            <p className="text-sm text-gray-400 mt-1">当有任务进入待结算状态后会出现在这里</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-xhs-pink-bg border-b border-xhs-pink-soft">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">taskId</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">taskNo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">userId</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">riskLevel</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">payoutStatus</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">createdAt</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.taskId}
                    className="border-b border-gray-100 hover:bg-xhs-pink-bg/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-sm text-gray-800">{row.taskId}</td>
                    <td className="py-3 px-4 text-gray-700">{row.taskNo}</td>
                    <td className="py-3 px-4 text-gray-600">{row.userId}</td>
                    <td className="py-3 px-4 text-gray-600">{row.amount != null ? `¥${row.amount}` : '—'}</td>
                    <td className="py-3 px-4">
                      {row.riskLevel ? (
                        <span
                          className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                            RISK_COLORS[row.riskLevel] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {row.riskLevel}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{row.payoutStatus ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">{formatDate(row.createdAt)}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openDetail(row.taskId)}
                        className="text-sm text-xhs-pink hover:text-xhs-rose font-medium"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-button bg-gray-800 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* 详情抽屉 */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeDrawer}
            aria-hidden
          />
          <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-[0_2px_12px_rgba(254,44,85,0.08)] z-50 flex flex-col rounded-l-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-xhs-pink-soft bg-xhs-pink-bg">
              <h2 className="text-lg font-semibold text-gray-800">任务详情</h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-2 rounded-button hover:bg-white/80 text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              ) : detail ? (
                <>
                  <section className="bg-gray-50 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">基础信息</h3>
                    <dl className="space-y-2 text-sm">
                      <div><dt className="text-gray-500">taskNo</dt><dd className="font-mono text-gray-800">{detail.taskNo}</dd></div>
                      <div><dt className="text-gray-500">用户 / taskId</dt><dd className="text-gray-800">{detail.taskId}</dd></div>
                      <div><dt className="text-gray-500">进度</dt><dd className="text-gray-800">{detail.progress} / {detail.required_helpers}</dd></div>
                      <div><dt className="text-gray-500">助力数</dt><dd className="text-gray-800">{detail.helpers?.length ?? 0}</dd></div>
                    </dl>
                  </section>
                  <section className="bg-gray-50 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">风险信息</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                          RISK_COLORS[riskLevel] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {riskLevel || '—'}
                      </span>
                      {riskReasons.length > 0 && (
                        <span className="text-xs text-gray-600">原因：{riskReasons.join('、')}</span>
                      )}
                    </div>
                  </section>
                  <section className="bg-gray-50 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">结算信息</h3>
                    <dl className="space-y-2 text-sm">
                      <div><dt className="text-gray-500">payoutStatus</dt><dd className="text-gray-800">{ledger?.payoutStatus ?? '—'}</dd></div>
                      <div><dt className="text-gray-500">qualifiedAt</dt><dd className="text-gray-800">{formatDate(ledger?.qualifiedAt ?? detail.qualified_at)}</dd></div>
                      <div><dt className="text-gray-500">payoutAt</dt><dd className="text-gray-800">{formatDate(ledger?.payoutAt ?? detail.payout_at)}</dd></div>
                    </dl>
                  </section>
                  {canOperate && (
                    <section className="rounded-2xl p-4 border border-xhs-pink-soft bg-white">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">审核操作</h3>
                      <label className="block text-sm font-medium text-gray-700 mb-2">备注（必填）</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="请填写审核或拒绝原因"
                        rows={3}
                        className="w-full px-3 py-2 rounded-button border border-gray-200 text-sm focus:border-xhs-pink outline-none resize-none"
                      />
                      <div className="flex gap-3 mt-4">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleApprove}
                          className="flex-1 py-2.5 rounded-button bg-xhs-pink text-white text-sm font-medium hover:bg-xhs-rose disabled:opacity-60 transition-colors"
                        >
                          {submitting ? '提交中...' : '✅ 审核通过'}
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleReject}
                          className="flex-1 py-2.5 rounded-button border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
                        >
                          ❌ 审核拒绝
                        </button>
                      </div>
                    </section>
                  )}
                  {!canOperate && (
                    <p className="text-sm text-xhs-gray">当前状态不可审核</p>
                  )}
                </>
              ) : (
                <p className="text-xhs-gray">加载失败或任务不存在</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
