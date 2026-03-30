import { useState } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import { queryApi } from '@/lib/api/queries';
import type { CreateQueryInput, ServiceCategory, Query } from '@/types/query';
import { SERVICE_CATEGORIES, QUERY_SOURCES } from '@/types/query';
import CapitalizedInput from '@/components/shared/CapitalizedInput';
import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';
import ServiceCategoryFields from './ServiceCategoryFields';
import DateRangePicker from './DateRangePicker';
import BudgetField from './BudgetField';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (query: Query) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const INITIAL_FORM: CreateQueryInput = {
  client_name: '',
  client_phone: '',
  client_whatsapp: '',
  client_email: '',
  service_category: 'umrah',
  destination: '',
  adults: 1,
  children: 0,
  infants: 0,
  departure_date: '',
  return_date: '',
  dates_tentative: false,
  service_details: {},
  budget_amount: undefined,
  budget_type: undefined,
  client_plan: '',
  internal_notes: '',
  query_source: '',
};

export default function CreateQueryModal({ isOpen, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateQueryInput>({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateField = <K extends keyof CreateQueryInput>(key: K, value: CreateQueryInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (category: ServiceCategory) => {
    setForm(prev => ({ ...prev, service_category: category, service_details: {} }));
  };

  const handleCounterChange = (field: 'adults' | 'children' | 'infants', delta: number) => {
    setForm(prev => {
      const current = prev[field] ?? 0;
      const min = field === 'adults' ? 1 : 0;
      const newVal = Math.max(min, current + delta);
      return { ...prev, [field]: newVal };
    });
  };

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      setError('Client name is required');
      return;
    }
    if (!form.client_phone.trim()) {
      setError('Client phone is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateQueryInput = {
        ...form,
        departure_date: form.departure_date || undefined,
        return_date: form.return_date || undefined,
        client_whatsapp: form.client_whatsapp || undefined,
        client_email: form.client_email || undefined,
        client_plan: form.client_plan || undefined,
        internal_notes: form.internal_notes || undefined,
        query_source: form.query_source || undefined,
      };
      const query = await queryApi.create(payload);
      onCreated(query);
      setForm({ ...INITIAL_FORM });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create query');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setForm({ ...INITIAL_FORM });
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl my-4 mx-4 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">New Query</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* ── Section 1: Client Info ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Client Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <CapitalizedInput
                    value={form.client_name}
                    onValueChange={val => updateField('client_name', val)}
                    placeholder="e.g. Jawaid Ahmed"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={form.client_phone}
                    onChange={e => updateField('client_phone', e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.client_whatsapp ?? ''}
                    onChange={e => updateField('client_whatsapp', e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.client_email ?? ''}
                    onChange={e => updateField('client_email', e.target.value)}
                    placeholder="e.g. client@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Query Source</label>
                <select
                  value={form.query_source ?? ''}
                  onChange={e => updateField('query_source', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select source</option>
                  {QUERY_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Section 2: Trip Details ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Trip Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                  <select
                    value={form.service_category}
                    onChange={e => handleCategoryChange(e.target.value as ServiceCategory)}
                    className={inputClass}
                  >
                    {SERVICE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <CapitalizedInput
                    value={form.destination}
                    onValueChange={val => updateField('destination', val)}
                    placeholder="e.g. Makkah & Madinah"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Passenger Counters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passengers</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { field: 'adults' as const, label: 'Adults' },
                    { field: 'children' as const, label: 'Children' },
                    { field: 'infants' as const, label: 'Infants' },
                  ]).map(({ field, label }) => (
                    <div key={field} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <span className="text-sm text-gray-700">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCounterChange(field, -1)}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
                          disabled={field === 'adults' ? form.adults <= 1 : (form[field] ?? 0) <= 0}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{form[field]}</span>
                        <button
                          type="button"
                          onClick={() => handleCounterChange(field, 1)}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Category-specific Fields ── */}
          {form.service_category && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                {SERVICE_CATEGORIES.find(c => c.value === form.service_category)?.label} Details
              </h3>
              <ServiceCategoryFields
                category={form.service_category}
                details={form.service_details ?? {}}
                onChange={details => updateField('service_details', details)}
                departureDate={form.departure_date ?? ''}
                returnDate={form.return_date ?? ''}
              />
            </section>
          )}

          {/* ── Section 4: Date Range ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Travel Dates</h3>
            <DateRangePicker
              departureDate={form.departure_date ?? ''}
              returnDate={form.return_date ?? ''}
              onDepartureDateChange={val => updateField('departure_date', val)}
              onReturnDateChange={val => updateField('return_date', val)}
              tentative={form.dates_tentative ?? false}
              onTentativeChange={val => updateField('dates_tentative', val)}
            />
          </section>

          {/* ── Section 5: Budget ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Budget</h3>
            <BudgetField
              amount={form.budget_amount}
              type={form.budget_type}
              onAmountChange={val => updateField('budget_amount', val)}
              onTypeChange={val => updateField('budget_type', val)}
            />
          </section>

          {/* ── Section 6: Client Plan ── */}
          <section>
            <TextAreaWithCleanup
              label="Client Plan"
              value={form.client_plan ?? ''}
              onChange={val => updateField('client_plan', val)}
              placeholder="Paste client's WhatsApp message or call notes..."
              rows={4}
            />
          </section>

          {/* ── Section 7: Internal Notes ── */}
          <section>
            <TextAreaWithCleanup
              label="Internal Notes"
              value={form.internal_notes ?? ''}
              onChange={val => updateField('internal_notes', val)}
              placeholder="Any internal notes or observations..."
              rows={3}
            />
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Create Query'}
          </button>
        </div>
      </div>
    </div>
  );
}
