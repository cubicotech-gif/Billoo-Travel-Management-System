'use client';

import { useState } from 'react';
import {
  Plus,
  Users,
  Search,
  X,
  Star,
  Trash2,
  Phone,
  CreditCard,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Query, QueryPassenger } from '@/types/query';
import { queryPassengerApi } from '@/lib/api/queries';
import { searchPassengers } from '@/lib/api/passengers';
import type { PassengerOption } from '@/types/finance';

interface Props {
  query: Query;
  passengers: QueryPassenger[];
  onRefresh: () => void;
}

export default function PassengersTab({ query, passengers, onRefresh }: Props) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const handleRemove = async (passengerId: string) => {
    try {
      await queryPassengerApi.remove(query.id, passengerId);
      onRefresh();
    } catch (err) {
      console.error('Failed to remove passenger:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetPrimary = async (passengerId: string) => {
    setSettingPrimaryId(passengerId);
    try {
      // Remove primary from all current passengers, then set new one
      for (const p of passengers) {
        if (p.is_primary && p.passenger_id !== passengerId) {
          await queryPassengerApi.remove(query.id, p.passenger_id);
          await queryPassengerApi.add(query.id, p.passenger_id, p.passenger_type, false);
        }
      }
      // Set the selected one as primary
      const target = passengers.find((p) => p.passenger_id === passengerId);
      if (target) {
        await queryPassengerApi.remove(query.id, passengerId);
        await queryPassengerApi.add(query.id, passengerId, target.passenger_type, true);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to set primary passenger:', err);
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Passengers ({passengers.length})
        </h2>
        <button
          onClick={() => setShowSearchModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Passenger
        </button>
      </div>

      {/* Passenger list or empty state */}
      {passengers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            No passengers linked yet
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Search and add passengers to this query to manage their documents and details.
          </p>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Passenger
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {passengers.map((qp) => {
            const p = qp.passenger;
            const isExpired =
              p?.passport_expiry &&
              new Date(p.passport_expiry) < new Date();

            return (
              <div
                key={qp.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Passenger info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {p ? `${p.first_name} ${p.last_name}` : 'Unknown'}
                      </span>
                      {qp.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Star className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          qp.passenger_type === 'adult'
                            ? 'bg-blue-50 text-blue-700'
                            : qp.passenger_type === 'child'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {qp.passenger_type.charAt(0).toUpperCase() +
                          qp.passenger_type.slice(1)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {p?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {p.phone}
                        </span>
                      )}
                      {p?.passport_number && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {p.passport_number}
                        </span>
                      )}
                      {p?.passport_expiry && (
                        <span
                          className={`flex items-center gap-1 ${
                            isExpired ? 'text-red-600 font-medium' : ''
                          }`}
                        >
                          Exp:{' '}
                          {format(new Date(p.passport_expiry), 'MMM d, yyyy')}
                          {isExpired && (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          )}
                        </span>
                      )}
                    </div>

                    {qp.notes && (
                      <p className="text-xs text-gray-400 mt-1">{qp.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!qp.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(qp.passenger_id)}
                        disabled={settingPrimaryId === qp.passenger_id}
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        title="Set as primary passenger"
                      >
                        {settingPrimaryId === qp.passenger_id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {removingId !== qp.passenger_id ? (
                      <button
                        onClick={() => setRemovingId(qp.passenger_id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove passenger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-700">Remove?</span>
                        <button
                          onClick={() => handleRemove(qp.passenger_id)}
                          className="px-2 py-0.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setRemovingId(null)}
                          className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search & Add Modal */}
      {showSearchModal && (
        <PassengerSearchModal
          queryId={query.id}
          existingPassengerIds={passengers.map((p) => p.passenger_id)}
          onAdd={async (passengerId: string, type: string) => {
            try {
              const isPrimary = passengers.length === 0;
              await queryPassengerApi.add(query.id, passengerId, type, isPrimary);
              onRefresh();
            } catch (err) {
              console.error('Failed to add passenger:', err);
            }
          }}
          onClose={() => setShowSearchModal(false)}
        />
      )}
    </div>
  );
}

// ─── Passenger Search Modal ───────────────────────────────

interface SearchModalProps {
  queryId: string;
  existingPassengerIds: string[];
  onAdd: (passengerId: string, type: string) => Promise<void>;
  onClose: () => void;
}

function PassengerSearchModal({
  queryId: _queryId,
  existingPassengerIds,
  onAdd,
  onClose,
}: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PassengerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('adult');

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchPassengers(term);
      setResults(data.filter((p) => !existingPassengerIds.includes(p.id)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (passenger: PassengerOption) => {
    setAddingId(passenger.id);
    try {
      await onAdd(passenger.id, selectedType);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Add Passenger
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Passenger type selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Type:</span>
            {(['adult', 'child', 'infant'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : searchTerm.length < 2 ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Type at least 2 characters to search
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No passengers found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((passenger) => (
                <div
                  key={passenger.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {passenger.first_name} {passenger.last_name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(passenger)}
                    disabled={addingId === passenger.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {addingId === passenger.id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
