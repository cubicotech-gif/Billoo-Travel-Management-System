import { MapPin, Calendar, Users, Phone, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Query } from '@/types/query';
import { formatCurrency } from '@/lib/formatCurrency';
import StageBadge from './StageBadge';

interface Props {
  query: Query;
  onClick: () => void;
}

export default function QueryCard({ query, onClick }: Props) {
  const hasPricing = query.total_selling > 0;
  const timeAgo = formatDistanceToNow(new Date(query.created_at), { addSuffix: true });

  const dateRange =
    query.departure_date && query.return_date
      ? `${new Date(query.departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(query.return_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : query.departure_date
        ? new Date(query.departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      {/* Header: Query number + Stage badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">
          {query.query_number}
        </span>
        <StageBadge stage={query.stage} />
      </div>

      {/* Client info */}
      <div className="mb-2">
        <h3 className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {query.client_name}
        </h3>
        <div className="flex items-center gap-1 mt-0.5 text-sm text-gray-500">
          <Phone className="w-3.5 h-3.5" />
          <span>{query.client_phone}</span>
        </div>
      </div>

      {/* Trip details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
        {query.destination && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{query.destination}</span>
          </div>
        )}
        {dateRange && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {dateRange}
              {query.dates_tentative && (
                <span className="ml-1 text-xs text-amber-600">(tentative)</span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span>{query.total_pax} pax</span>
        </div>
      </div>

      {/* Pricing + Timestamp footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {hasPricing ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(query.total_selling_pkr, 'PKR')}
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp
                className={`w-3.5 h-3.5 ${
                  query.profit_margin >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  query.profit_margin >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {query.profit_margin.toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No pricing yet</span>
        )}
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>
    </div>
  );
}
