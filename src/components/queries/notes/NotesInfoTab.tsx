import { useState, useEffect } from 'react';
import { Save, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Query } from '@/types/query';
import { STAGE_CONFIG, SERVICE_CATEGORIES, QUERY_SOURCES } from '@/types/query';
import { queryApi } from '@/lib/api/queries';
import { fetchActivities } from '@/lib/api/activity';
import type { Activity } from '@/types/finance';
import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';

interface Props {
  query: Query;
  onRefresh: () => void;
}

export default function NotesInfoTab({ query, onRefresh }: Props) {
  const [clientPlan, setClientPlan] = useState(query.client_plan || '');
  const [internalNotes, setInternalNotes] = useState(query.internal_notes || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  useEffect(() => {
    setClientPlan(query.client_plan || '');
    setInternalNotes(query.internal_notes || '');
    setDirty(false);
  }, [query.id]);

  useEffect(() => {
    if (!activitiesLoaded) {
      fetchActivities('query', query.id, 50)
        .then(data => { setActivities(data); setActivitiesLoaded(true); })
        .catch(() => {});
    }
  }, [query.id, activitiesLoaded]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await queryApi.update(query.id, {
        client_plan: clientPlan || undefined,
        internal_notes: internalNotes || undefined,
      } as Partial<Query>);
      setDirty(false);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === query.service_category)?.label || query.service_category;
  const sourceLabel = QUERY_SOURCES.find(s => s.value === query.query_source)?.label || query.query_source;

  return (
    <div className="space-y-6">
      {/* Client Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Client Plan / Requirements</h3>
        <TextAreaWithCleanup
          value={clientPlan}
          onChange={v => { setClientPlan(v); setDirty(true); }}
          placeholder="Paste the client's WhatsApp message or call notes here..."
          rows={5}
        />
      </div>

      {/* Internal Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Internal Notes</h3>
        <TextAreaWithCleanup
          value={internalNotes}
          onChange={v => { setInternalNotes(v); setDirty(true); }}
          placeholder="Team notes, reminders, follow-up actions..."
          rows={4}
        />
      </div>

      {/* Save button */}
      {dirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Notes
          </button>
        </div>
      )}

      {/* Query Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Query Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Query Number</span>
            <p className="font-medium text-gray-900">{query.query_number}</p>
          </div>
          <div>
            <span className="text-gray-500">Category</span>
            <p className="font-medium text-gray-900">{categoryLabel}</p>
          </div>
          <div>
            <span className="text-gray-500">Source</span>
            <p className="font-medium text-gray-900">{sourceLabel || 'Not set'}</p>
          </div>
          <div>
            <span className="text-gray-500">Stage</span>
            <p className="font-medium text-gray-900">{STAGE_CONFIG[query.stage]?.label}</p>
          </div>
          <div>
            <span className="text-gray-500">Destination</span>
            <p className="font-medium text-gray-900">{query.destination}</p>
          </div>
          <div>
            <span className="text-gray-500">Passengers</span>
            <p className="font-medium text-gray-900">{query.adults}A + {query.children}C + {query.infants}I = {query.total_pax} pax</p>
          </div>
          {query.departure_date && (
            <div>
              <span className="text-gray-500">Departure</span>
              <p className="font-medium text-gray-900">{format(new Date(query.departure_date), 'dd MMM yyyy')}</p>
            </div>
          )}
          {query.return_date && (
            <div>
              <span className="text-gray-500">Return</span>
              <p className="font-medium text-gray-900">{format(new Date(query.return_date), 'dd MMM yyyy')}</p>
            </div>
          )}
          {query.budget_amount && (
            <div>
              <span className="text-gray-500">Budget</span>
              <p className="font-medium text-gray-900">
                PKR {query.budget_amount.toLocaleString()} ({query.budget_type === 'per_person' ? 'per person' : 'total'})
              </p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created</span>
            <p className="font-medium text-gray-900">{format(new Date(query.created_at), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        {/* Service-specific details */}
        {query.service_details && Object.keys(query.service_details).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Service Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(query.service_details).map(([key, val]) => (
                <div key={key}>
                  <span className="text-gray-500">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <p className="font-medium text-gray-900">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity Log</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {activities.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{a.description}</p>
                  <p className="text-xs text-gray-400">{format(new Date(a.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
