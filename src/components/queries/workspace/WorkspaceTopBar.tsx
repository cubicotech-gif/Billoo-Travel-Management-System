import { useState } from 'react';
import { CalendarDays, MapPin, Phone, Users, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Query, QueryService, QueryStage } from '@/types/query';
import { STAGE_CONFIG } from '@/types/query';
import { formatCurrency } from '@/lib/formatCurrency';
import StageBadge from '../StageBadge';

interface Props {
  query: Query;
  services: QueryService[];
  onStageChange?: (stage: QueryStage) => void;
}

const STAGE_ORDER: QueryStage[] = [
  'new_inquiry', 'building_package', 'quote_sent', 'negotiating',
  'confirmed_paying', 'booking_docs', 'ready_to_travel', 'completed', 'cancelled',
];

export default function WorkspaceTopBar({ query, services, onStageChange }: Props) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const hasServices = services.length > 0;
  const perPerson = query.total_pax > 0 ? query.total_selling_pkr / query.total_pax : 0;

  return (
    <div className="sticky top-0 z-10 bg-white border-b">
      <div className="px-4 py-3 sm:px-6">
        {/* Row 1: Query header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {query.query_number}
            </h1>

            {/* Stage badge with dropdown */}
            {onStageChange ? (
              <div className="relative">
                <button
                  onClick={() => setShowStageMenu(!showStageMenu)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <StageBadge stage={query.stage} size="md" />
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showStageMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowStageMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
                      {STAGE_ORDER.map(stage => {
                        const cfg = STAGE_CONFIG[stage];
                        const isCurrent = stage === query.stage;
                        return (
                          <button
                            key={stage}
                            onClick={() => {
                              if (!isCurrent) onStageChange(stage);
                              setShowStageMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              isCurrent
                                ? `${cfg.bgColor} ${cfg.color} font-medium`
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-current' : 'bg-gray-300'}`} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <StageBadge stage={query.stage} size="md" />
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 font-medium text-gray-900">
              {query.client_name}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {query.client_phone}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {query.destination}
            </span>
          </div>
        </div>

        {/* Row 2: Dates + Pax */}
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
          {query.departure_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(new Date(query.departure_date), 'MMM d, yyyy')}
              {query.return_date && (
                <> &ndash; {format(new Date(query.return_date), 'MMM d, yyyy')}</>
              )}
              {query.dates_tentative && (
                <span className="text-xs text-amber-600 ml-1">(tentative)</span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {query.total_pax} pax
            <span className="text-xs text-gray-400">
              ({query.adults}A
              {query.children > 0 && ` ${query.children}C`}
              {query.infants > 0 && ` ${query.infants}I`})
            </span>
          </span>
        </div>

        {/* Row 3: Financial summary cards */}
        {hasServices && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <FinancialCard
              label="Total Cost"
              value={formatCurrency(query.total_cost_pkr, 'PKR')}
              className="text-gray-900"
            />
            <FinancialCard
              label="Total Selling"
              value={formatCurrency(query.total_selling_pkr, 'PKR')}
              className="text-gray-900"
            />
            <FinancialCard
              label="Profit"
              value={formatCurrency(query.total_profit_pkr, 'PKR')}
              subtitle={`${query.profit_margin.toFixed(1)}% margin`}
              className={
                query.total_profit_pkr > 0
                  ? 'text-green-700'
                  : query.total_profit_pkr < 0
                    ? 'text-red-700'
                    : 'text-gray-900'
              }
            />
            <FinancialCard
              label="Per Person"
              value={formatCurrency(perPerson, 'PKR')}
              className="text-gray-900"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FinancialCard({
  label,
  value,
  subtitle,
  className = '',
}: {
  label: string;
  value: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${className}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
