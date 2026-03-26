import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { cloneQuery, type CloneQueryInput } from '../../lib/api/queries';

interface Props {
  sourceQuery: {
    id: string;
    query_number: string;
    client_name: string;
    client_phone: string;
    client_email?: string | null;
    destination: string;
    travel_date?: string | null;
    return_date?: string | null;
  };
  onClose: () => void;
  onSuccess: (newQueryId: string) => void;
}

export default function CloneQueryModal({ sourceQuery, onClose, onSuccess }: Props) {
  const [cloneOptions, setCloneOptions] = useState({
    cloneServices: true,
    clonePassengers: false,
    cloneNotes: false,
  });
  const [formData, setFormData] = useState<CloneQueryInput>({
    client_name: sourceQuery.client_name,
    client_phone: sourceQuery.client_phone,
    client_email: sourceQuery.client_email,
    destination: sourceQuery.destination,
    travel_date: null,
    return_date: null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.client_phone) return;

    setLoading(true);
    try {
      const newQuery = await cloneQuery(sourceQuery.id, formData, cloneOptions);
      onSuccess(newQuery.id);
    } catch (err: any) {
      alert('Failed to clone query: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Clone Query #{sourceQuery.query_number}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Clone Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What to clone</label>
            <div className="space-y-2">
              {[
                { key: 'cloneServices', label: 'Services & service details' },
                { key: 'clonePassengers', label: 'Passengers' },
                { key: 'cloneNotes', label: 'Notes & reminders' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(cloneOptions as any)[key]}
                    onChange={(e) => setCloneOptions({ ...cloneOptions, [key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* New Query Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">New Query Details</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Phone *</label>
              <input
                type="tel"
                required
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Destination</label>
              <input
                type="text"
                value={formData.destination || ''}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={formData.travel_date || ''}
                  onChange={(e) => setFormData({ ...formData, travel_date: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Return Date</label>
                <input
                  type="date"
                  value={formData.return_date || ''}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                'Cloning...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Clone Query
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
