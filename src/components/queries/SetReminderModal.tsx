import { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { createQueryReminder } from '../../lib/api/queries';

interface Props {
  queryId: string;
  queryNumber: string;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetReminderModal({ queryId, queryNumber, clientName, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(`Follow up with ${clientName}`);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  // Quick date setters
  const setQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    setLoading(true);
    try {
      await createQueryReminder(queryId, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: new Date(dueDate).toISOString(),
        priority,
        reminder_type: 'manual',
      });
      onSuccess();
    } catch (err: any) {
      alert('Failed to create reminder: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Set Reminder</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">Query #{queryNumber} - {clientName}</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Due Date *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <div className="flex gap-2 mt-2">
              {[
                { label: 'Tomorrow', days: 1 },
                { label: '3 Days', days: 3 },
                { label: '1 Week', days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setQuickDate(days)}
                  className="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !dueDate}
              className="px-4 py-2 text-sm text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Setting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
