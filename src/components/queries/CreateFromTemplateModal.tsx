import { useState, useEffect } from 'react';
import { X, FileText, ChevronRight } from 'lucide-react';
import { getTemplates, createQueryFromTemplate, type QueryTemplate } from '../../lib/api/queries';

const CATEGORY_LABELS: Record<string, string> = {
  umrah_economy: 'Umrah Economy',
  umrah_standard: 'Umrah Standard',
  umrah_premium: 'Umrah Premium',
  hajj: 'Hajj',
  leisure: 'Leisure',
  visa_only: 'Visa Only',
  custom: 'Custom',
};

interface Props {
  onClose: () => void;
  onSuccess: (newQueryId: string) => void;
}

export default function CreateFromTemplateModal({ onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    destination: '',
    travel_date: '',
    return_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    roe: 75,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates({ isActive: true });
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (t: QueryTemplate) => {
    setSelectedTemplate(t);
    setFormData(prev => ({
      ...prev,
      destination: t.destination || '',
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !formData.client_name || !formData.client_phone) return;

    setCreating(true);
    try {
      const paxCount = formData.adults + formData.children + formData.infants;
      const query = await createQueryFromTemplate(
        selectedTemplate.id,
        {
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email || undefined,
          destination: formData.destination || undefined,
          travel_date: formData.travel_date || undefined,
          return_date: formData.return_date || undefined,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
        },
        paxCount || 1,
        formData.roe
      );
      onSuccess(query.id);
    } catch (err: any) {
      alert('Failed to create query: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = filterCategory
    ? templates.filter(t => t.category === filterCategory)
    : templates;

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))] as string[];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {selectedTemplate ? 'Create from Template' : 'Select Template'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedTemplate ? (
            // Template selection
            <div className="space-y-3">
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setFilterCategory('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${!filterCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    All
                  </button>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${filterCategory === c ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {CATEGORY_LABELS[c] || c}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading templates...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates found. Save a query as a template first.
                </div>
              ) : (
                filtered.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        {t.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full">{CATEGORY_LABELS[t.category] || t.category}</span>}
                        {t.destination && <span>{t.destination}</span>}
                        {t.duration_days && <span>{t.duration_days} days</span>}
                        <span>{t.services_template.length} services</span>
                      </div>
                      {t.description && <div className="text-xs text-gray-500 mt-1">{t.description}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          ) : (
            // Query creation form
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-medium text-green-800">Template: {selectedTemplate.name}</div>
                <div className="text-xs text-green-600 mt-0.5">
                  {selectedTemplate.services_template.length} services will be created
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs text-green-700 underline mt-1"
                >
                  Change template
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Client Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Destination</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={formData.travel_date}
                    onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Adults</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ROE (Exchange Rate)</label>
                  <input
                    type="number"
                    min={1}
                    step={0.01}
                    value={formData.roe}
                    onChange={(e) => setFormData({ ...formData, roe: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Query'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
