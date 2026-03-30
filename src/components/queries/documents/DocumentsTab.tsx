'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Loader,
  AlertCircle,
  Upload,
  ShieldCheck,
  Clock,
  XCircle,
  Users,
} from 'lucide-react';
import type { QueryPassenger, DocumentChecklist } from '@/types/query';
import { checklistApi } from '@/lib/api/queries';

interface Props {
  queryId: string;
  passengers: QueryPassenger[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string; badgeClass: string }
> = {
  missing: {
    label: 'Missing',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    className: 'text-red-600',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  uploaded: {
    label: 'Uploaded',
    icon: <Upload className="w-3.5 h-3.5" />,
    className: 'text-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  verified: {
    label: 'Verified',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    className: 'text-green-600',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
  },
  expired: {
    label: 'Expired',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'text-red-600',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  passport_photo: 'Passport Photo',
  cnic: 'CNIC',
  vaccination: 'Vaccination Certificate',
  visa: 'Visa',
  ticket: 'Ticket',
  hotel_voucher: 'Hotel Voucher',
  insurance: 'Insurance',
  other: 'Other',
};

const STATUS_OPTIONS = ['missing', 'uploaded', 'verified', 'expired', 'rejected'] as const;

export default function DocumentsTab({ queryId, passengers }: Props) {
  const [checklist, setChecklist] = useState<DocumentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadChecklist();
  }, [queryId]);

  const loadChecklist = async () => {
    try {
      const data = await checklistApi.getByQuery(queryId);
      setChecklist(data);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (item: DocumentChecklist, newStatus: string) => {
    setUpdatingId(item.id);
    try {
      await checklistApi.updateStatus(item.id, newStatus);
      setChecklist((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: newStatus as DocumentChecklist['status'] } : c))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Group checklist items by passenger
  const grouped = passengers.reduce<
    { passenger: QueryPassenger; items: DocumentChecklist[] }[]
  >((acc, qp) => {
    const items = checklist.filter((c) => c.passenger_id === qp.passenger_id);
    acc.push({ passenger: qp, items });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (passengers.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No passengers yet</h3>
        <p className="text-sm text-gray-500">
          Add passengers to this query first, then you can track their documents here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Document Checklist</h2>

      {grouped.map(({ passenger: qp, items }) => {
        const p = qp.passenger;
        const completedCount = items.filter(
          (i) => i.status === 'verified' || i.status === 'uploaded'
        ).length;
        const totalRequired = items.filter((i) => i.required).length;

        return (
          <div
            key={qp.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Passenger header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">
                    {p?.first_name?.charAt(0) || '?'}
                    {p?.last_name?.charAt(0) || ''}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p ? `${p.first_name} ${p.last_name}` : 'Unknown'}
                  </p>
                  {qp.is_primary && (
                    <span className="text-xs text-amber-600">Primary</span>
                  )}
                </div>
              </div>
              {totalRequired > 0 && (
                <span className="text-xs text-gray-500">
                  {completedCount}/{totalRequired} required docs ready
                </span>
              )}
            </div>

            {/* Document items */}
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No checklist items generated yet for this passenger.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const statusConfig =
                    STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={statusConfig.className}>
                          {statusConfig.icon}
                        </span>
                        <div>
                          <p className="text-sm text-gray-900">
                            {DOCUMENT_TYPE_LABELS[item.document_type] ||
                              item.document_type}
                            {item.required && (
                              <span className="text-red-500 ml-0.5">*</span>
                            )}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status dropdown */}
                      <div className="flex items-center gap-2">
                        {updatingId === item.id ? (
                          <Loader className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(item, e.target.value)
                            }
                            className={`text-xs font-medium rounded-lg border px-2 py-1 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${statusConfig.badgeClass}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {checklist.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <SummaryDot className="bg-red-500" label="Missing" count={checklist.filter((c) => c.status === 'missing').length} />
            <SummaryDot className="bg-blue-500" label="Uploaded" count={checklist.filter((c) => c.status === 'uploaded').length} />
            <SummaryDot className="bg-green-500" label="Verified" count={checklist.filter((c) => c.status === 'verified').length} />
            <SummaryDot className="bg-amber-500" label="Expired" count={checklist.filter((c) => c.status === 'expired').length} />
            <SummaryDot className="bg-red-400" label="Rejected" count={checklist.filter((c) => c.status === 'rejected').length} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryDot({ className, label, count }: { className: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${className}`} />
      {label}: {count}
    </span>
  );
}
