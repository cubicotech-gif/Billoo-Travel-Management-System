'use client';

import {
  Building2,
  Plane,
  FileText,
  Car,
  Map,
  Shield,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { QueryService, ServiceType } from '@/types/query';
import { SERVICE_TYPE_CONFIG } from '@/types/query';
import { formatCurrency, formatDualCurrency } from '@/lib/formatCurrency';
import type { CurrencyCode } from '@/lib/formatCurrency';

interface Props {
  service: QueryService;
  onEdit: () => void;
  onDelete: () => void;
}

const ICON_MAP: Record<ServiceType, React.ReactNode> = {
  hotel: <Building2 className="w-5 h-5" />,
  flight: <Plane className="w-5 h-5" />,
  visa: <FileText className="w-5 h-5" />,
  transport: <Car className="w-5 h-5" />,
  tour: <Map className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  other: <Package className="w-5 h-5" />,
};

const BG_MAP: Record<ServiceType, string> = {
  hotel: 'bg-blue-50 border-blue-200',
  flight: 'bg-sky-50 border-sky-200',
  visa: 'bg-purple-50 border-purple-200',
  transport: 'bg-amber-50 border-amber-200',
  tour: 'bg-green-50 border-green-200',
  insurance: 'bg-red-50 border-red-200',
  other: 'bg-gray-50 border-gray-200',
};

export default function ServiceCard({ service, onEdit, onDelete }: Props) {
  const config = SERVICE_TYPE_CONFIG[service.service_type];
  const details = service.service_details || {};
  const currency = service.currency as CurrencyCode;
  const isPKR = currency === 'PKR';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b ${BG_MAP[service.service_type]}`}
      >
        <div className="flex items-center gap-2">
          <span className={config.color}>{ICON_MAP[service.service_type]}</span>
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-white/80 transition-colors"
            title="Edit service"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-white/80 transition-colors"
            title="Delete service"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Description */}
        <p className="text-sm font-medium text-gray-900">{service.description}</p>

        {/* Vendor */}
        {service.vendor_name && (
          <p className="text-xs text-gray-500">
            Vendor: <span className="text-gray-700">{service.vendor_name}</span>
          </p>
        )}

        {/* Key details based on type */}
        <KeyDetails type={service.service_type} details={details} />

        {/* Pricing */}
        <div className="border-t border-gray-100 pt-2 mt-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Cost</p>
              <p className="text-gray-700 font-medium">
                {isPKR
                  ? formatCurrency(service.cost_price_pkr, 'PKR')
                  : formatDualCurrency(service.cost_price, currency, service.cost_price_pkr)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Selling</p>
              <p className="text-gray-700 font-medium">
                {isPKR
                  ? formatCurrency(service.selling_price_pkr, 'PKR')
                  : formatDualCurrency(service.selling_price, currency, service.selling_price_pkr)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Profit</p>
              <p
                className={`font-medium ${
                  service.profit_pkr > 0
                    ? 'text-green-600'
                    : service.profit_pkr < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {isPKR
                  ? formatCurrency(service.profit_pkr, 'PKR')
                  : formatDualCurrency(service.profit, currency, service.profit_pkr)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyDetails({
  type,
  details,
}: {
  type: ServiceType;
  details: Record<string, any>;
}) {
  const items: { label: string; value: string }[] = [];

  switch (type) {
    case 'hotel':
      if (details.hotel_name) items.push({ label: 'Hotel', value: details.hotel_name });
      if (details.room_type) items.push({ label: 'Room', value: details.room_type });
      if (details.nights) items.push({ label: 'Nights', value: String(details.nights) });
      if (details.check_in) items.push({ label: 'Check-in', value: details.check_in });
      break;
    case 'flight':
      if (details.airline) items.push({ label: 'Airline', value: details.airline });
      if (details.route) items.push({ label: 'Route', value: details.route });
      if (details.flight_class) items.push({ label: 'Class', value: details.flight_class });
      break;
    case 'visa':
      if (details.visa_type) items.push({ label: 'Type', value: details.visa_type });
      if (details.country) items.push({ label: 'Country', value: details.country });
      if (details.processing_time)
        items.push({ label: 'Processing', value: details.processing_time });
      break;
    case 'transport':
      if (details.vehicle_type) items.push({ label: 'Vehicle', value: details.vehicle_type });
      if (details.route) items.push({ label: 'Route', value: details.route });
      break;
    case 'tour':
      if (details.tour_name) items.push({ label: 'Tour', value: details.tour_name });
      if (details.duration) items.push({ label: 'Duration', value: details.duration });
      break;
    case 'insurance':
      if (details.provider) items.push({ label: 'Provider', value: details.provider });
      if (details.coverage) items.push({ label: 'Coverage', value: details.coverage });
      break;
    default:
      break;
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="text-xs text-gray-500">
          {item.label}:{' '}
          <span className="text-gray-700 font-medium">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
