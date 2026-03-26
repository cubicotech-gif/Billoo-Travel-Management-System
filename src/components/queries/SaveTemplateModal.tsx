import { useState } from 'react';
import { X, BookmarkPlus } from 'lucide-react';
import { saveAsTemplate } from '../../lib/api/queries';

const CATEGORIES = [
  { value: 'umrah_economy', label: 'Umrah Economy' },
  { value: 'umrah_standard', label: 'Umrah Standard' },
  { value: 'umrah_premium', label: 'Umrah Premium' },
  { value: 'hajj', label: 'Hajj' },
  { value: 'leisure', label: 'Leisure' },
  { value: 'visa_only', label: 'Visa Only' },
  { value: 'custom', label: 'Custom' },
];

interface Props {
  queryId: string;
  queryNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaveTemplateModal({ queryId, queryNumber, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await saveAsTemplate(queryId, {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        duration_days: durationDays ? Number(durationDays) : undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert('Failed to save template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Save as Template</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Save Query #{queryNumber} services as a reusable template.
          </p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Umrah 14-Day Economy Package"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 14"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
