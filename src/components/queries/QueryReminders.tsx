import { useEffect, useState } from 'react';
import { Bell, Check, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { getQueryReminders, completeReminder, snoozeReminder, type Reminder } from '../../lib/api/queries';

interface Props {
  queryId: string;
}

export default function QueryReminders({ queryId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, [queryId]);

  const loadReminders = async () => {
    try {
      const data = await getQueryReminders(queryId);
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReminder(id);
      await loadReminders();
    } catch (err: any) {
      alert('Failed to complete reminder: ' + err.message);
    }
  };

  const handleSnooze = async (id: string, days: number) => {
    try {
      await snoozeReminder(id, days);
      await loadReminders();
    } catch (err: any) {
      alert('Failed to snooze reminder: ' + err.message);
    }
  };

  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  if (loading) return null;
  if (reminders.length === 0) return null;

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();
  const isDueToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">
          Reminders {activeReminders.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
              {activeReminders.length}
            </span>
          )}
        </h3>
      </div>

      {activeReminders.length > 0 && (
        <div className="space-y-2">
          {activeReminders.map(r => (
            <div
              key={r.id}
              className={`p-3 rounded-lg border text-sm ${
                isOverdue(r.due_date)
                  ? 'bg-red-50 border-red-200'
                  : isDueToday(r.due_date)
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isOverdue(r.due_date) && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    <span className="font-medium text-gray-900 truncate">{r.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className={isOverdue(r.due_date) ? 'text-red-600 font-medium' : ''}>
                      {isOverdue(r.due_date) ? 'Overdue: ' : ''}
                      {format(new Date(r.due_date), 'MMM dd, yyyy')}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full ${
                      r.priority === 'high' ? 'bg-red-100 text-red-700' :
                      r.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {r.priority}
                    </span>
                  </div>
                  {r.description && <p className="text-xs text-gray-500 mt-1">{r.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleSnooze(r.id, 1)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    title="Snooze 1 day"
                  >
                    +1d
                  </button>
                  <button
                    onClick={() => handleComplete(r.id)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Mark complete"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedReminders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Completed ({completedReminders.length})</p>
          {completedReminders.slice(0, 3).map(r => (
            <div key={r.id} className="text-xs text-gray-400 line-through py-0.5">{r.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
