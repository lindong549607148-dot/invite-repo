import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskDetail } from '@/api/taskDetail'
import { refundApprove, refundReject } from '@/api/admin'
import type { TaskDetail as TaskDetailType } from '@/api/taskDetail'

const STATUS_MAP: Record<string, string> = {
  HELPING: '助力中',
  QUALIFIED: '已达标',
  PENDING_PAYOUT: '待结算',
  PAID_OUT: '已打款',
  REJECTED: '已拒绝',
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<TaskDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const rejectVisible = true

  const load = () => {
    if (!taskId) return
    setLoading(true)
    taskDetail(taskId)
      .then(setDetail)
      .catch((e) => setToast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [taskId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleApprove = async () => {
    if (!taskId) return
    if (!note.trim()) {
      showToast('请填写审核备注')
      return
    }
    setSubmitting(true)
    try {
      await refundApprove(taskId, note.trim())
      showToast('审核通过')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!taskId) return
    if (!note.trim()) {
      showToast('请填写拒绝备注')
      return
    }
    setSubmitting(true)
    try {
      await refundReject(taskId, note.trim())
      showToast('已拒绝')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const canApprove = detail?.status === 'PENDING_PAYOUT'

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-xhs-gray">
        加载中...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="text-sm text-xhs-pink hover:underline"
        >
          ← 返回任务列表
        </button>
        <p className="text-xhs-gray">任务不存在或加载失败</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="text-sm text-xhs-pink hover:underline"
        >
          ← 返回任务列表
        </button>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-button bg-gray-800 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-card p-5 border border-xhs-pink-soft shadow-card">
            <h1 className="text-lg font-bold text-gray-800">任务详情</h1>
            <p className="text-sm text-xhs-gray mt-1">taskId: {detail.taskId} · taskNo: {detail.taskNo}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span>状态：<strong>{STATUS_MAP[detail.status] ?? detail.status}</strong></span>
              <span>进度：{detail.progress}/{detail.required_helpers}</span>
              {detail.risk_flags?.has_pending_review && (
                <span className="text-amber-600">存在待审核助力</span>
              )}
            </div>
            <div className="mt-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2">助力列表</h2>
              <div className="space-y-2">
                {detail.helpers?.map((h) => (
                  <div
                    key={h.helperUserId}
                    className="flex items-center gap-3 py-2 px-3 rounded-button bg-xhs-pink-bg"
                  >
                    <img src={h.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-medium text-gray-800">{h.nickname}</span>
                    <span className="text-xs text-xhs-gray">{h.status}</span>
                    {h.orderId && <span className="text-xs text-gray-500">订单 {h.orderId}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-card p-5 border border-xhs-pink-soft shadow-card sticky top-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">审核操作</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">备注（必填）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="审核备注"
                rows={3}
                className="w-full px-3 py-2 rounded-button border border-gray-200 text-sm focus:border-xhs-pink outline-none resize-none"
              />
              {canApprove && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApprove}
                    className="w-full py-2.5 rounded-button bg-xhs-pink text-white text-sm font-medium hover:bg-xhs-rose disabled:opacity-60 transition-colors"
                  >
                    {submitting ? '提交中...' : '审核通过'}
                  </button>
                  {rejectVisible && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReject}
                      className="w-full py-2.5 rounded-button border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                      拒绝
                    </button>
                  )}
                </>
              )}
              {!canApprove && (
                <p className="text-sm text-xhs-gray">当前状态不可审核</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
