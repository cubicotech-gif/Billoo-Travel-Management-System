import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { getAllPendingReminders, completeReminder, snoozeReminder, type Reminder } from '../../lib/api/queries';

export default function TravelAlertsDashboard() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<(Reminder & { query_number?: string; client_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const data = await getAllPendingReminders();
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
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error('Failed:', err);
    }
  };

  const handleSnooze = async (id: string) => {
    try {
      await snoozeReminder(id, 1);
      await loadReminders();
    } catch (err: any) {
      console.error('Failed:', err);
    }
  };

  if (loading || reminders.length === 0) return null;

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  const overdueCount = reminders.filter(r => isOverdue(r.due_date)).length;

  return (
    <div className="card-premium">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-display font-bold text-gray-900">
            Pending Reminders
          </h3>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">{reminders.length} total</span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {reminders.slice(0, 10).map(r => (
          <div
            key={r.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isOverdue(r.due_date) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => r.entity_type === 'query' && navigate(`/queries/${r.entity_id}`)}
            >
              <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <Clock className="w-3 h-3" />
                <span className={isOverdue(r.due_date) ? 'text-red-600 font-medium' : ''}>
                  {format(new Date(r.due_date), 'MMM dd')}
                </span>
                {r.query_number && (
                  <span className="text-blue-600">#{r.query_number}</span>
                )}
                {r.client_name && (
                  <span>{r.client_name}</span>
                )}
                {isOverdue(r.due_date) && (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={() => handleSnooze(r.id)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                title="Snooze 1 day"
              >
                +1d
              </button>
              <button
                onClick={() => handleComplete(r.id)}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Complete"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
