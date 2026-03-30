import { useState } from 'react';
import {
  Plus, Package, Users, FileText, StickyNote,
  Calculator, ArrowLeft, XCircle, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Query, QueryService, QueryStatus } from '@/types/query-workflow';
import { formatCurrency, type CurrencyCode } from '@/lib/formatCurrency';
import { deleteQueryService } from '@/lib/api/queries';
import { format } from 'date-fns';

import ServiceCard from './ServiceCard';
import ServiceAddModal from '../ServiceAddModal';
import PackageCalculator from '../PackageCalculator';
import QueryDocumentSection from '../QueryDocumentSection';
import { fetchActivities } from '@/lib/api/activity';
import type { Activity } from '@/types/finance';
import { supabase } from '@/lib/supabase';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onStatusChange: (status: QueryStatus) => void;
}

type TabKey = 'services' | 'passengers' | 'documents' | 'notes';

interface PassengerRow {
  id: string;
  passenger_id: string;
  passenger_type: string;
  passengers?: {
    id: string;
    full_name: string;
    phone?: string;
    passport_number?: string;
    date_of_birth?: string;
  };
}

export default function QueryWorkspaceStage2({ query, services, onRefresh, onStatusChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('services');
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<QueryService | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Passengers state
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [passengersLoaded, setPassengersLoaded] = useState(false);

  // Notes tab state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  // ── Compute totals from services ──
  const totalCostPkr = services.reduce((sum, s) =>
    sum + (s.cost_price_pkr || s.cost_price || 0) * (s.quantity || 1), 0);
  const totalSellingPkr = services.reduce((sum, s) =>
    sum + (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1), 0);
  const totalProfitPkr = totalSellingPkr - totalCostPkr;
  const profitMargin = totalSellingPkr > 0 ? (totalProfitPkr / totalSellingPkr) * 100 : 0;
  const totalPax = query.adults + query.children + query.infants;
  const perPersonPkr = totalPax > 0 ? totalSellingPkr / totalPax : 0;

  // Also compute foreign currency totals (SAR is most common)
  const foreignServices = services.filter(s => s.currency && s.currency !== 'PKR');
  const hasForeignCurrency = foreignServices.length > 0;
  const primaryForeignCurrency = hasForeignCurrency
    ? (foreignServices[0].currency as CurrencyCode)
    : null;
  const totalCostForeign = foreignServices.reduce((sum, s) =>
    sum + (s.cost_price || 0) * (s.quantity || 1), 0);
  const totalSellingForeign = foreignServices.reduce((sum, s) =>
    sum + (s.selling_price || 0) * (s.quantity || 1), 0);
  const totalProfitForeign = totalSellingForeign - totalCostForeign;

  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  // ── Service handlers ──
  const handleServiceAdded = () => {
    setShowAddService(false);
    setEditingService(null);
    onRefresh();
  };

  const handleDeleteService = async (service: QueryService) => {
    if (!confirm(`Delete "${service.service_description}"?\nThis will remove this service from the package.`)) return;
    try {
      await deleteQueryService(service.id);
      onRefresh();
    } catch (err: any) {
      alert('Failed to delete service: ' + err.message);
    }
  };

  // ── Load passengers on tab switch ──
  const loadPassengers = async () => {
    if (passengersLoaded) return;
    try {
      const { data } = await supabase
        .from('query_passengers')
        .select('id, passenger_id, passenger_type, passengers(id, full_name, phone, passport_number, date_of_birth)')
        .eq('query_id', query.id);
      setPassengers((data as unknown as PassengerRow[]) || []);
      setPassengersLoaded(true);
    } catch { /* ignore */ }
  };

  // ── Load activities on tab switch ──
  const loadActivities = async () => {
    if (activitiesLoaded) return;
    try {
      const data = await fetchActivities('query', query.id, 50);
      setActivities(data);
      setActivitiesLoaded(true);
    } catch { /* ignore */ }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'passengers') loadPassengers();
    if (tab === 'notes') loadActivities();
  };

  // ── Tab definitions ──
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'services', label: 'Services', icon: <Package className="w-4 h-4" /> },
    { key: 'passengers', label: 'Passengers', icon: <Users className="w-4 h-4" /> },
    { key: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { key: 'notes', label: 'Notes & Info', icon: <StickyNote className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-0">
      {/* ═══════════════ STICKY TOP BAR ═══════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        {/* Query info row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600 mb-4">
          <span className="font-semibold text-gray-900">{query.query_number}</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {query.client_name}
          </span>
          {query.client_phone && (
            <span className="text-gray-500">{query.client_phone}</span>
          )}
          {query.destination && (
            <span className="text-gray-500">{query.destination}</span>
          )}
          {query.travel_date && (
            <span className="text-gray-500">
              {format(new Date(query.travel_date), 'dd MMM')}
              {query.return_date && ` — ${format(new Date(query.return_date), 'dd MMM yyyy')}`}
            </span>
          )}
          <span className="text-gray-500">{totalPax} pax ({passengerText})</span>
        </div>

        {/* Totals cards */}
        {services.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Total Cost</div>
              {hasForeignCurrency && primaryForeignCurrency && (
                <div className="text-sm text-gray-600">{formatCurrency(totalCostForeign, primaryForeignCurrency)}</div>
              )}
              <div className="text-lg font-bold text-gray-900">{formatCurrency(totalCostPkr)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Total Selling</div>
              {hasForeignCurrency && primaryForeignCurrency && (
                <div className="text-sm text-gray-600">{formatCurrency(totalSellingForeign, primaryForeignCurrency)}</div>
              )}
              <div className="text-lg font-bold text-gray-900">{formatCurrency(totalSellingPkr)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="text-[11px] text-green-700 uppercase tracking-wide mb-1">Profit</div>
              {hasForeignCurrency && primaryForeignCurrency && (
                <div className="text-sm text-green-600">{formatCurrency(totalProfitForeign, primaryForeignCurrency)}</div>
              )}
              <div className="text-lg font-bold text-green-700">{formatCurrency(totalProfitPkr)}</div>
              <div className="text-[11px] text-green-600 mt-0.5">Margin {profitMargin.toFixed(1)}%</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="text-[11px] text-blue-700 uppercase tracking-wide mb-1">Per Person</div>
              <div className="text-lg font-bold text-blue-700">{formatCurrency(perPersonPkr)}</div>
              <div className="text-[11px] text-blue-600 mt-0.5">÷ {totalPax} pax</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">No services added yet — totals will appear here</div>
        )}
      </div>

      {/* ═══════════════ TABS ═══════════════ */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'services' && services.length > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{services.length}</span>
              )}
              {tab.key === 'passengers' && passengersLoaded && passengers.length > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{passengers.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ TAB CONTENT ═══════════════ */}

      {/* TAB: Services */}
      {activeTab === 'services' && (
        <div>
          {/* Action bar */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setShowAddService(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
            <button
              onClick={() => setShowCalculator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Package Calculator
            </button>
          </div>

          {/* Service cards */}
          {services.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No services added yet</p>
              <p className="text-sm text-gray-400 mb-6">Start building the package by adding services.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAddService(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
                <button
                  onClick={() => setShowCalculator(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Open Calculator
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={() => { setEditingService(service); setShowAddService(true); }}
                  onDelete={() => handleDeleteService(service)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Passengers */}
      {activeTab === 'passengers' && (
        <PassengersTabContent
          passengers={passengers}
          onRefresh={() => { setPassengersLoaded(false); loadPassengers(); }}
        />
      )}

      {/* TAB: Documents */}
      {activeTab === 'documents' && (
        <QueryDocumentSection query={query} onRefresh={onRefresh} />
      )}

      {/* TAB: Notes & Info */}
      {activeTab === 'notes' && (
        <NotesInfoTabContent query={query} activities={activities} />
      )}

      {/* ═══════════════ BOTTOM ACTION BAR ═══════════════ */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <button
          onClick={() => onStatusChange('Responded - Awaiting Reply')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiry
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Cancel this query? This will mark it as Cancelled.')) {
                onStatusChange('Cancelled');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Cancel Query
          </button>
          <button
            onClick={() => {
              if (services.length === 0) {
                alert('Add at least one service before sending the proposal.');
                return;
              }
              onStatusChange('Proposal Sent');
            }}
            disabled={services.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Send Quote to Client
          </button>
        </div>
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}
      {showAddService && (
        <ServiceAddModal
          queryId={query.id}
          onClose={() => { setShowAddService(false); setEditingService(null); }}
          onSuccess={handleServiceAdded}
          editService={editingService}
        />
      )}

      {showCalculator && (
        <PackageCalculator
          queryId={query.id}
          passengers={totalPax}
          onClose={() => setShowCalculator(false)}
          onAddToQuery={() => { setShowCalculator(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── PASSENGERS TAB CONTENT ──────────────────────────────────────────

function PassengersTabContent({
  passengers,
  onRefresh,
}: {
  passengers: PassengerRow[];
  onRefresh: () => void;
}) {
  const navigate = useNavigate();

  const handleRemovePassenger = async (qpId: string, name: string) => {
    if (!confirm(`Remove "${name}" from this query?\nTheir passenger profile will NOT be deleted.`)) return;
    try {
      await supabase.from('query_passengers').delete().eq('id', qpId);
      onRefresh();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  if (passengers.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <Users className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium mb-2">No passengers linked yet</p>
        <p className="text-sm text-gray-400">Link passengers from the Passengers module to this query.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {passengers.length} Passenger{passengers.length !== 1 ? 's' : ''} Linked
        </h3>
      </div>
      {passengers.map((qp) => {
        const p = qp.passengers;
        if (!p) return null;
        const age = p.date_of_birth
          ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
          : null;

        return (
          <div key={qp.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{p.full_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                  {qp.passenger_type || 'Adult'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {p.phone && <span>{p.phone}</span>}
                {p.passport_number && <span>Passport: {p.passport_number}</span>}
                {age !== null && <span>Age: {age}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/passengers/${p.id}`)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View Profile
              </button>
              <button
                onClick={() => handleRemovePassenger(qp.id, p.full_name)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NOTES & INFO TAB CONTENT ────────────────────────────────────────

function NotesInfoTabContent({ query, activities }: { query: Query; activities: Activity[] }) {
  return (
    <div className="space-y-6">
      {/* Client Plan */}
      {query.tentative_plan && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Client Plan</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
            {query.tentative_plan}
          </p>
        </div>
      )}

      {/* Internal Notes */}
      {query.internal_reminders && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Internal Notes</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{query.internal_reminders}</p>
        </div>
      )}

      {/* Query Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Query Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Created:</span> <span className="text-gray-800">{new Date(query.created_at).toLocaleString()}</span></div>
          {query.query_source && <div><span className="text-gray-500">Source:</span> <span className="text-gray-800">{query.query_source}</span></div>}
          {query.service_type && <div><span className="text-gray-500">Service Type:</span> <span className="text-gray-800">{query.service_type}</span></div>}
          {query.destination && <div><span className="text-gray-500">Destination:</span> <span className="text-gray-800">{query.destination}</span></div>}
          {(query as any).budget_amount && (
            <div><span className="text-gray-500">Budget:</span> <span className="text-gray-800">
              Rs {Number((query as any).budget_amount).toLocaleString()} {(query as any).budget_type === 'per_person' ? 'per person' : 'total'}
            </span></div>
          )}
          {(query as any).package_nights && (
            <div><span className="text-gray-500">Package:</span> <span className="text-gray-800">
              {Number((query as any).package_nights) - 1} Days {(query as any).package_nights} Nights
            </span></div>
          )}
          {(query as any).hotel_preferences && (
            <div><span className="text-gray-500">Hotel Pref:</span> <span className="text-gray-800">{(query as any).hotel_preferences}</span></div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Activity Log</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <span className="text-gray-400 whitespace-nowrap min-w-[120px]">
                  {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-gray-700">{a.description || a.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
