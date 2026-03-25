import { useEffect, useState } from 'react'
import { Clock, Loader } from 'lucide-react'
import { format } from 'date-fns'
import { fetchActivities } from '@/lib/api/activity'
import type { Activity } from '@/types/finance'

interface ActivityTimelineProps {
  entityType: string
  entityId: string
  limit?: number
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  payment_received: 'bg-emerald-100 text-emerald-700',
  payment_made: 'bg-red-100 text-red-700',
  status_changed: 'bg-purple-100 text-purple-700',
  note_added: 'bg-yellow-100 text-yellow-700',
  document_uploaded: 'bg-cyan-100 text-cyan-700',
  invoice_created: 'bg-indigo-100 text-indigo-700',
  email_sent: 'bg-pink-100 text-pink-700',
}

export default function ActivityTimeline({ entityType, entityId, limit = 50 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [entityType, entityId])

  const loadActivities = async () => {
    try {
      const data = await fetchActivities(entityType, entityId, limit)
      setActivities(data)
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {idx < activities.length - 1 && (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white text-xs font-medium ${
                    ACTION_COLORS[activity.action] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {activity.action.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium capitalize">{activity.action.replace(/_/g, ' ')}</span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
