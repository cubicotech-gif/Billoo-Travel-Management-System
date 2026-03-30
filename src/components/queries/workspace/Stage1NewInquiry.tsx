'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Pencil,
  Save,
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MapPin,
  Users,
  Briefcase,
  DollarSign,
  StickyNote,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Query, QueryStage, QueryPassenger } from '@/types/query';
import { SERVICE_CATEGORIES, QUERY_SOURCES } from '@/types/query';
import { queryApi } from '@/lib/api/queries';
import CapitalizedInput from '@/components/shared/CapitalizedInput';
import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';
import PassengersTab from '../passengers/PassengersTab';

interface Props {
  query: Query;
  passengers: QueryPassenger[];
  onStageChange: (stage: QueryStage) => void;
  onRefresh: () => void;
}

function formatDetailKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function Stage1NewInquiry({
  query,
  passengers,
  onStageChange,
  onRefresh,
}: Props) {
  // ─── Client Info Edit State ────────────────────
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    client_name: query.client_name,
    client_phone: query.client_phone,
    client_whatsapp: query.client_whatsapp || '',
    client_email: query.client_email || '',
    query_source: query.query_source || '',
  });
  const [savingClient, setSavingClient] = useState(false);

  // ─── Trip Details Edit State ───────────────────
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    service_category: query.service_category,
    destination: query.destination,
    departure_date: query.departure_date || '',
    return_date: query.return_date || '',
    dates_tentative: query.dates_tentative,
    adults: query.adults,
    children: query.children,
    infants: query.infants,
    budget_amount: query.budget_amount ?? 0,
    budget_type: query.budget_type || 'total',
    service_details: query.service_details || {},
  });
  const [savingTrip, setSavingTrip] = useState(false);

  // ─── Client Plan State ─────────────────────────
  const [clientPlan, setClientPlan] = useState(query.client_plan || '');
  const [savingPlan, setSavingPlan] = useState(false);

  // ─── Internal Notes State ──────────────────────
  const [internalNotes, setInternalNotes] = useState(query.internal_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesChanged = internalNotes !== (query.internal_notes || '');

  // ─── Passengers ────────────────────────────────
  const [showPassengersTab, setShowPassengersTab] = useState(false);

  // ─── Handlers ──────────────────────────────────

  const handleSaveClient = async () => {
    setSavingClient(true);
    try {
      await queryApi.update(query.id, {
        client_name: clientForm.client_name,
        client_phone: clientForm.client_phone,
        client_whatsapp: clientForm.client_whatsapp || undefined,
        client_email: clientForm.client_email || undefined,
        query_source: clientForm.query_source || undefined,
      } as Partial<Query>);
      setEditingClient(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save client info:', err);
    } finally {
      setSavingClient(false);
    }
  };

  const handleCancelClient = () => {
    setClientForm({
      client_name: query.client_name,
      client_phone: query.client_phone,
      client_whatsapp: query.client_whatsapp || '',
      client_email: query.client_email || '',
      query_source: query.query_source || '',
    });
    setEditingClient(false);
  };

  const handleSaveTrip = async () => {
    setSavingTrip(true);
    try {
      await queryApi.update(query.id, {
        service_category: tripForm.service_category,
        destination: tripForm.destination,
        departure_date: tripForm.departure_date || undefined,
        return_date: tripForm.return_date || undefined,
        dates_tentative: tripForm.dates_tentative,
        adults: tripForm.adults,
        children: tripForm.children,
        infants: tripForm.infants,
        budget_amount: tripForm.budget_amount || undefined,
        budget_type: tripForm.budget_type as 'total' | 'per_person',
        service_details: tripForm.service_details,
      } as Partial<Query>);
      setEditingTrip(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save trip details:', err);
    } finally {
      setSavingTrip(false);
    }
  };

  const handleCancelTrip = () => {
    setTripForm({
      service_category: query.service_category,
      destination: query.destination,
      departure_date: query.departure_date || '',
      return_date: query.return_date || '',
      dates_tentative: query.dates_tentative,
      adults: query.adults,
      children: query.children,
      infants: query.infants,
      budget_amount: query.budget_amount ?? 0,
      budget_type: query.budget_type || 'total',
      service_details: query.service_details || {},
    });
    setEditingTrip(false);
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      await queryApi.update(query.id, { client_plan: clientPlan } as Partial<Query>);
      onRefresh();
    } catch (err) {
      console.error('Failed to save client plan:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await queryApi.update(query.id, { internal_notes: internalNotes } as Partial<Query>);
      onRefresh();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const categoryLabel =
    SERVICE_CATEGORIES.find((c) => c.value === query.service_category)?.label ||
    query.service_category;

  const sourceLabel =
    QUERY_SOURCES.find((s) => s.value === query.query_source)?.label ||
    query.query_source ||
    '--';

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  const selectClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-5">
      {/* ── Header Banner ─────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-semibold text-blue-800">NEW INQUIRY</span>
          <span className="text-blue-700 ml-1.5">
            — This query hasn&apos;t been worked on yet.
          </span>
        </div>
      </div>

      {/* ── Client Info ───────────────────────────── */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Client Information
          </h3>
          {!editingClient ? (
            <button
              onClick={() => setEditingClient(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelClient}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSaveClient}
                disabled={savingClient}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingClient ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {!editingClient ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Name</p>
              <p className="text-sm font-medium text-gray-900">{query.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="text-sm font-medium text-gray-900">{query.client_phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> WhatsApp
              </p>
              <p className="text-sm font-medium text-gray-900">
                {query.client_whatsapp || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="text-sm font-medium text-gray-900">
                {query.client_email || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Source</p>
              <p className="text-sm font-medium text-gray-900">{sourceLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Created
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(query.created_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <CapitalizedInput
                value={clientForm.client_name}
                onValueChange={(val) =>
                  setClientForm((prev) => ({ ...prev, client_name: val }))
                }
                className={inputClass}
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={clientForm.client_phone}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, client_phone: e.target.value }))
                }
                className={inputClass}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={clientForm.client_whatsapp}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, client_whatsapp: e.target.value }))
                }
                className={inputClass}
                placeholder="WhatsApp number"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={clientForm.client_email}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, client_email: e.target.value }))
                }
                className={inputClass}
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select
                value={clientForm.query_source}
                onChange={(e) =>
                  setClientForm((prev) => ({ ...prev, query_source: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">Select source</option>
                {QUERY_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Created</label>
              <p className="text-sm font-medium text-gray-900 py-2">
                {formatDate(query.created_at)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Trip Details ──────────────────────────── */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Trip Details
          </h3>
          {!editingTrip ? (
            <button
              onClick={() => setEditingTrip(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelTrip}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSaveTrip}
                disabled={savingTrip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingTrip ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {!editingTrip ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Service Category
                </p>
                <p className="text-sm font-medium text-gray-900">{categoryLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Destination
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {query.destination || '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Travel Dates
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(query.departure_date)}
                  {query.return_date ? ` - ${formatDate(query.return_date)}` : ''}
                  {query.dates_tentative && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Tentative
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Passengers
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {query.adults} Adult{query.adults !== 1 ? 's' : ''}
                  {query.children > 0 &&
                    `, ${query.children} Child${query.children !== 1 ? 'ren' : ''}`}
                  {query.infants > 0 &&
                    `, ${query.infants} Infant${query.infants !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Budget
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {query.budget_amount
                    ? `PKR ${query.budget_amount.toLocaleString()} (${query.budget_type === 'per_person' ? 'per person' : 'total'})`
                    : '--'}
                </p>
              </div>
            </div>

            {/* Service-specific details from JSONB */}
            {query.service_details &&
              Object.keys(query.service_details).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    Service-Specific Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(query.service_details).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-gray-500 mb-0.5">
                          {formatDetailKey(key)}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {typeof value === 'boolean'
                            ? value
                              ? 'Yes'
                              : 'No'
                            : String(value || '--')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Service Category
                </label>
                <select
                  value={tripForm.service_category}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      service_category: e.target.value as typeof prev.service_category,
                    }))
                  }
                  className={selectClass}
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Destination</label>
                <CapitalizedInput
                  value={tripForm.destination}
                  onValueChange={(val) =>
                    setTripForm((prev) => ({ ...prev, destination: val }))
                  }
                  className={inputClass}
                  placeholder="Destination"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={tripForm.departure_date}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, departure_date: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Return Date</label>
                <input
                  type="date"
                  value={tripForm.return_date}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, return_date: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 py-2">
                  <input
                    type="checkbox"
                    checked={tripForm.dates_tentative}
                    onChange={(e) =>
                      setTripForm((prev) => ({
                        ...prev,
                        dates_tentative: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Dates are tentative
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adults</label>
                <input
                  type="number"
                  min={0}
                  value={tripForm.adults}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      adults: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Children</label>
                <input
                  type="number"
                  min={0}
                  value={tripForm.children}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      children: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Infants</label>
                <input
                  type="number"
                  min={0}
                  value={tripForm.infants}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      infants: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Budget Amount</label>
                <input
                  type="number"
                  min={0}
                  value={tripForm.budget_amount}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      budget_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={inputClass}
                  placeholder="Budget amount"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Budget Type</label>
                <select
                  value={tripForm.budget_type}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      budget_type: e.target.value as 'total' | 'per_person',
                    }))
                  }
                  className={selectClass}
                >
                  <option value="total">Total</option>
                  <option value="per_person">Per Person</option>
                </select>
              </div>
            </div>

            {/* Editable service details */}
            {Object.keys(tripForm.service_details).length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Service-Specific Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(tripForm.service_details).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">
                        {formatDetailKey(key)}
                      </label>
                      {typeof value === 'boolean' ? (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 py-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) =>
                              setTripForm((prev) => ({
                                ...prev,
                                service_details: {
                                  ...prev.service_details,
                                  [key]: e.target.checked,
                                },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {formatDetailKey(key)}
                        </label>
                      ) : (
                        <input
                          type="text"
                          value={String(value || '')}
                          onChange={(e) =>
                            setTripForm((prev) => ({
                              ...prev,
                              service_details: {
                                ...prev.service_details,
                                [key]: e.target.value,
                              },
                            }))
                          }
                          className={inputClass}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Client Plan ───────────────────────────── */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Client Plan
          </h3>
          {clientPlan !== (query.client_plan || '') && (
            <button
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {savingPlan ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        {query.client_plan && clientPlan === query.client_plan && (
          <div className="mb-3 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {query.client_plan}
            </p>
          </div>
        )}

        <TextAreaWithCleanup
          value={clientPlan}
          onChange={setClientPlan}
          placeholder="What does the client want? Describe their travel plan here..."
          rows={4}
        />
      </div>

      {/* ── Passengers ────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Passengers
            <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {passengers.length}
            </span>
          </h3>
          <button
            onClick={() => setShowPassengersTab(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Passenger
          </button>
        </div>

        {passengers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {passengers.map((qp) => (
              <div
                key={qp.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                    {qp.passenger?.first_name?.[0] || '?'}
                    {qp.passenger?.last_name?.[0] || ''}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {qp.passenger
                        ? `${qp.passenger.first_name} ${qp.passenger.last_name}`
                        : 'Unknown'}
                      {qp.is_primary && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          Primary
                        </span>
                      )}
                    </p>
                    {qp.passenger?.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {qp.passenger.phone}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    qp.passenger_type === 'adult'
                      ? 'bg-green-50 text-green-700'
                      : qp.passenger_type === 'child'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {qp.passenger_type.charAt(0).toUpperCase() +
                    qp.passenger_type.slice(1)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            No passengers linked yet. Add passengers to this query.
          </p>
        )}

        {showPassengersTab && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <PassengersTab
              query={query}
              passengers={passengers}
              onRefresh={() => {
                onRefresh();
                setShowPassengersTab(false);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Internal Notes ────────────────────────── */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-gray-500" />
            Internal Notes
          </h3>
          {notesChanged && (
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {savingNotes ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        <TextAreaWithCleanup
          value={internalNotes}
          onChange={setInternalNotes}
          placeholder="Private notes about this query (not visible to client)..."
          rows={3}
        />
      </div>

      {/* ── Bottom Action ─────────────────────────── */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={() => onStageChange('building_package')}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Start Building Package
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
