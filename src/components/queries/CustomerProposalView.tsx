import { FileText } from 'lucide-react';
import { Query, QueryService } from '../../types/query-workflow';
import { format } from 'date-fns';
import ServiceDetailsDisplay from './ServiceDetailsDisplay';

interface Props {
  query: Query;
  services: QueryService[];
}

/**
 * Customer-facing proposal view - DOES NOT show vendor costs or profit margins
 * Only shows total price and per-person breakdown
 */
export default function CustomerProposalView({ query, services }: Props) {
  const totalPrice = services.reduce((sum, s) => sum + ((s.selling_price || 0) * (s.quantity || 1)), 0);

  const totalPax = (query.adults || 0) + (query.children || 0) + (query.infants || 0);
  const perPersonPrice = totalPax > 0 ? Math.round(totalPrice / totalPax) : totalPrice;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'TBD';
    try {
      return format(new Date(date), 'MMMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const getServiceIcon = (type: string) => {
    const icons: Record<string, string> = {
      Hotel: '🏨',
      Flight: '✈️',
      Transport: '🚗',
      Visa: '📄',
      Activity: '🎯',
      Guide: '👨‍🏫',
      Insurance: '🛡️',
      Other: '📋'
    };
    return icons[type] || '📋';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Package Proposal
      </h3>

      {/* Customer Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 text-xs mb-1">Customer</p>
            <p className="font-semibold text-gray-900">{query.client_name}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs mb-1">Destination</p>
            <p className="font-semibold text-gray-900">{query.destination}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs mb-1">Travel Dates</p>
            <p className="font-semibold text-gray-900">
              {formatDate(query.travel_date)}
              {query.return_date && ` - ${formatDate(query.return_date)}`}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-xs mb-1">Passengers</p>
            <p className="font-semibold text-gray-900">
              {query.adults > 0 && `${query.adults} Adult${query.adults > 1 ? 's' : ''}`}
              {query.children > 0 && `, ${query.children} Child${query.children > 1 ? 'ren' : ''}`}
              {query.infants > 0 && `, ${query.infants} Infant${query.infants > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Services - CUSTOMER VIEW (no vendor names or costs) */}
      <div className="space-y-3 mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">📦 Package Includes:</h4>
        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No services added yet</p>
          </div>
        ) : (
          services.map((service, index) => (
            <div key={service.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{getServiceIcon(service.service_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {service.service_type}
                    </span>
                    {service.quantity && service.quantity > 1 && (
                      <span className="text-xs text-gray-600">× {service.quantity}</span>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1">{service.service_description}</h5>

                  {/* Service-specific details */}
                  <ServiceDetailsDisplay type={service.service_type} details={service.service_details} />

                  {/* NO VENDOR INFORMATION SHOWN TO CUSTOMER */}
                  {/* NO COST PRICE SHOWN TO CUSTOMER */}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Price - CUSTOMER VIEW ONLY (Total and Per Person) */}
      {services.length > 0 && (
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Package Price:</span>
              <span className="text-3xl font-bold text-blue-600">
                Rs {totalPrice.toLocaleString()}
              </span>
            </div>

            {totalPax > 1 && (
              <div className="flex justify-between items-center text-lg bg-blue-50 p-3 rounded-lg">
                <span className="text-gray-700 font-medium">Per Person:</span>
                <span className="text-xl font-bold text-blue-700">
                  Rs {perPersonPrice.toLocaleString()}
                </span>
              </div>
            )}

            {query.is_tentative_dates && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Dates are tentative and subject to availability
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NO VENDOR COSTS, NO PROFIT MARGINS - CUSTOMER FACING ONLY */}
    </div>
  );
}
