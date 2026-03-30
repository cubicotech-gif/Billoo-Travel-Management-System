import { Pencil, Trash2, Building2, Plane, FileText, Bus, Ticket, Shield, Package } from 'lucide-react';
import { QueryService } from '@/types/query-workflow';
import { formatCurrency, type CurrencyCode } from '@/lib/formatCurrency';

interface ServiceCardProps {
  service: QueryService;
  onEdit: () => void;
  onDelete: () => void;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  Hotel: <Building2 className="w-5 h-5" />,
  Flight: <Plane className="w-5 h-5" />,
  Visa: <FileText className="w-5 h-5" />,
  Transport: <Bus className="w-5 h-5" />,
  Activity: <Ticket className="w-5 h-5" />,
  Tour: <Ticket className="w-5 h-5" />,
  Insurance: <Shield className="w-5 h-5" />,
  Guide: <Package className="w-5 h-5" />,
  Other: <Package className="w-5 h-5" />,
};

const SERVICE_COLORS: Record<string, string> = {
  Hotel: 'bg-blue-600',
  Flight: 'bg-sky-600',
  Visa: 'bg-amber-600',
  Transport: 'bg-emerald-600',
  Activity: 'bg-purple-600',
  Tour: 'bg-purple-600',
  Insurance: 'bg-rose-600',
  Guide: 'bg-teal-600',
  Other: 'bg-gray-600',
};

export default function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  const cur = (service.currency || 'PKR') as CurrencyCode;
  const isForeign = cur !== 'PKR';
  const qty = service.quantity || 1;

  const costOrig = (service.cost_price || 0) * qty;
  const sellOrig = (service.selling_price || 0) * qty;
  const profitOrig = sellOrig - costOrig;

  const costPkr = (service.cost_price_pkr || service.cost_price || 0) * qty;
  const sellPkr = (service.selling_price_pkr || service.selling_price || 0) * qty;
  const profitPkr = sellPkr - costPkr;

  const icon = SERVICE_ICONS[service.service_type] || SERVICE_ICONS.Other;
  const color = SERVICE_COLORS[service.service_type] || SERVICE_COLORS.Other;

  // Build detail snippets from service_details
  const details = service.service_details || {};
  const detailParts: string[] = [];
  if (details.room_type) detailParts.push(details.room_type);
  if (details.meal_plan) detailParts.push(details.meal_plan);
  if (details.star_rating) detailParts.push(`${details.star_rating}-star`);
  if (details.class) detailParts.push(details.class);
  if (details.airline) detailParts.push(details.airline);
  if (details.from_city && details.to_city) detailParts.push(`${details.from_city} → ${details.to_city}`);
  if (details.visa_type) detailParts.push(details.visa_type);
  if (details.vehicle_type) detailParts.push(details.vehicle_type);
  if (details.pickup_location && details.dropoff_location) detailParts.push(`${details.pickup_location} → ${details.dropoff_location}`);

  // Date display
  const dateStr = (() => {
    if (details.check_in && details.check_out) {
      return `${new Date(details.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${new Date(details.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (service.service_date) {
      return new Date(service.service_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`${color} text-white p-1.5 rounded-md`}>
            {icon}
          </div>
          <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            {service.service_type}
            {qty > 1 && <span className="text-gray-500 font-normal"> × {qty}</span>}
          </span>
          {isForeign && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
              {cur} @ {service.exchange_rate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit service"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete service"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <h4 className="text-base font-semibold text-gray-900 mb-1">
          {service.service_description}
        </h4>
        {service.vendors && (
          <p className="text-sm text-gray-500 mb-3">Vendor: {service.vendors.name}</p>
        )}

        {/* Pricing Row */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Cost</div>
            {isForeign && (
              <div className="text-sm text-gray-600">{formatCurrency(costOrig, cur)}</div>
            )}
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(costPkr)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Selling</div>
            {isForeign && (
              <div className="text-sm text-gray-600">{formatCurrency(sellOrig, cur)}</div>
            )}
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(sellPkr)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Profit</div>
            {isForeign && (
              <div className={`text-sm ${profitOrig >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profitOrig, cur)}</div>
            )}
            <div className={`text-sm font-semibold ${profitPkr >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(profitPkr)}</div>
          </div>
        </div>

        {/* Details & Date */}
        {(detailParts.length > 0 || dateStr) && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            {detailParts.length > 0 && (
              <p className="text-xs text-gray-500">
                Details: {detailParts.join(' | ')}
              </p>
            )}
            {dateStr && (
              <p className="text-xs text-gray-500">Date: {dateStr}</p>
            )}
          </div>
        )}

        {service.notes && (
          <p className="text-xs text-gray-400 mt-2 italic">{service.notes}</p>
        )}
      </div>
    </div>
  );
}
