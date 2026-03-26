import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react'
import { getQueryReadinessSummary, type QueryReadinessSummary } from '@/lib/api/documents'

interface Props {
  queryId: string
  refreshKey?: number
}

export default function DocumentChecklistSummary({ queryId, refreshKey }: Props) {
  const [summary, setSummary] = useState<QueryReadinessSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [queryId, refreshKey])

  const loadSummary = async () => {
    try {
      const data = await getQueryReadinessSummary(queryId)
      setSummary(data)
    } catch (err) {
      console.error('Error loading readiness summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) return null
  if (summary.total === 0) return null

  const percentage = summary.total > 0 ? Math.round((summary.ready / summary.total) * 100) : 0
  const allReady = summary.ready === summary.total && summary.warnings.length === 0

  return (
    <div className={`rounded-lg border-2 p-4 ${
      allReady
        ? 'bg-green-50 border-green-300'
        : summary.warnings.length > 0
        ? 'bg-amber-50 border-amber-300'
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold text-sm ${
          allReady ? 'text-green-800' : summary.warnings.length > 0 ? 'text-amber-800' : 'text-blue-800'
        }`}>
          {allReady ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Travel Documents Ready
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Travel Readiness: {summary.ready}/{summary.total} required documents
            </span>
          )}
        </h4>
        <span className="text-sm font-bold">{percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            allReady ? 'bg-green-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {summary.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {summary.missing > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          {summary.missing} required document{summary.missing > 1 ? 's' : ''} still missing
        </p>
      )}
    </div>
  )
}
