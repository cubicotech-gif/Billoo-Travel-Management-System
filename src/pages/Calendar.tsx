import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar as CalendarIcon, Plus, Bell, Check, X, Clock,
  AlertCircle
} from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday } from 'date-fns'

interface Reminder {
  id: string
  title: string
  description: string | null
  due_date: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  reminder_type: string
  is_completed: boolean
  entity_type: string
  entity_id: string
}

interface TravelDate {
  id: string
  query_number: string
  client_name: string
  destination: string
  travel_date: string
  return_date: string | null
  status: string
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [travelDates, setTravelDates] = useState<TravelDate[]>([])
  const [showModal, setShowModal] = useState(false)
  const [filterPriority, setFilterPriority] = useState('all')
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    reminder_type: 'follow_up' as any
  })

  useEffect(() => {
    loadData()
  }, [currentDate])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load reminders for current month
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      const { data: remindersData } = await supabase
        .from('reminders')
        .select('*')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true })

      setReminders(remindersData || [])

      // Load upcoming travel dates
      const { data: queriesData } = await supabase
        .from('queries')
        .select('id, query_number, client_name, destination, travel_date, return_date, status')
        .not('travel_date', 'is', null)
        .gte('travel_date', startDate)
        .lte('travel_date', endDate)
        .order('travel_date', { ascending: true })

      setTravelDates(queriesData || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from('reminders').insert([{
        ...formData,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        entity_type: 'query',
        entity_id: '00000000-0000-0000-0000-000000000000' // Placeholder
      }])

      if (error) throw error

      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        priority: 'medium',
        reminder_type: 'follow_up'
      })
      loadData()
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Failed to create reminder')
    }
  }

  const toggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error updating reminder:', error)
    }
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const days: Date[] = []

    // Add days from previous month to fill the week
    const startDay = start.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(addDays(start, -i - 1))
    }

    // Add all days of current month
    let currentDay = start
    while (currentDay <= end) {
      days.push(currentDay)
      currentDay = addDays(currentDay, 1)
    }

    // Add days from next month to complete the week
    const endDay = end.getDay()
    for (let i = 1; i < 7 - endDay; i++) {
      days.push(addDays(end, i))
    }

    return days
  }

  const getRemindersForDate = (date: Date) => {
    return reminders.filter(r => isSameDay(new Date(r.due_date), date))
  }

  const getTravelForDate = (date: Date) => {
    return travelDates.filter(t => isSameDay(new Date(t.travel_date), date))
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700 border-gray-300',
      medium: 'bg-blue-100 text-blue-700 border-blue-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      urgent: 'bg-red-100 text-red-700 border-red-300'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent') return <AlertCircle className="w-4 h-4" />
    if (priority === 'high') return <Bell className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }

  const days = getDaysInMonth()

  const filteredReminders = filterPriority === 'all'
    ? reminders
    : reminders.filter(r => r.priority === filterPriority)

  const upcomingReminders = filteredReminders
    .filter(r => !r.is_completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar & Reminders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track travel dates, follow-ups, and important deadlines
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Reminder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -30))}
                className="btn btn-secondary px-3 py-1"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="btn btn-secondary px-3 py-1"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 30))}
                className="btn btn-secondary px-3 py-1"
              >
                →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            {days.map((day, index) => {
              const dayReminders = getRemindersForDate(day)
              const dayTravel = getTravelForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={index}
                  className={`min-h-24 p-2 border rounded ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  } ${isCurrentDay ? 'border-primary-500 border-2' : 'border-gray-200'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayReminders.slice(0, 2).map(reminder => (
                      <div
                        key={reminder.id}
                        className={`text-xs px-2 py-1 rounded border ${getPriorityColor(reminder.priority)} ${
                          reminder.is_completed ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        {reminder.title}
                      </div>
                    ))}
                    {dayTravel.slice(0, 1).map(travel => (
                      <div
                        key={travel.id}
                        className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-300"
                      >
                        ✈️ {travel.destination}
                      </div>
                    ))}
                    {(dayReminders.length + dayTravel.length) > 3 && (
                      <div className="text-xs text-gray-500 pl-2">
                        +{dayReminders.length + dayTravel.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming Reminders Sidebar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming</h3>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(reminder.priority)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(reminder.priority)}
                      <span className="text-sm font-medium">{reminder.title}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleComplete(reminder.id, reminder.is_completed)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {reminder.description && (
                    <p className="text-xs text-gray-600 mb-2">{reminder.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {format(new Date(reminder.due_date), 'MMM dd, yyyy')}
                    </span>
                    <span className="capitalize text-gray-500">{reminder.reminder_type}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No upcoming reminders</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Travel Dates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Travel Dates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {travelDates.length > 0 ? (
            travelDates.map(travel => (
              <div key={travel.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">{travel.client_name}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">✈️ {travel.destination}</p>
                <div className="text-xs text-gray-600">
                  <p>Travel: {format(new Date(travel.travel_date), 'MMM dd, yyyy')}</p>
                  {travel.return_date && (
                    <p>Return: {format(new Date(travel.return_date), 'MMM dd, yyyy')}</p>
                  )}
                  <p className="mt-2">
                    <span className="inline-block px-2 py-1 bg-purple-200 text-purple-800 rounded">
                      {travel.status}
                    </span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">No upcoming travel dates</p>
          )}
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />

            <div className="inline-block bg-white rounded-lg p-6 shadow-xl transform transition-all sm:max-w-lg sm:w-full z-50">
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Reminder</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input"
                      placeholder="e.g., Follow up with Mr. Sharma"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.reminder_type}
                      onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value })}
                      className="input"
                    >
                      <option value="follow_up">Follow Up</option>
                      <option value="payment_due">Payment Due</option>
                      <option value="document_expiry">Document Expiry</option>
                      <option value="travel_date">Travel Date</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button type="submit" className="btn btn-primary flex-1">
                    Add Reminder
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
