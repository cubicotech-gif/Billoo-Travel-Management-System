import { Package, FileText, Download, Truck } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';

interface Props {
  query: Query;
  services: QueryService[];
  onStartDelivery: () => void;
}

export default function StageServicesBooked({ query, services, onStartDelivery }: Props) {
  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-600 text-white p-3 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              🎉 All Services Successfully Booked!
            </h3>
            <p className="text-sm text-indigo-700">
              All vendors have been paid and all bookings are confirmed. The package is ready for
              delivery to the customer.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Confirmed Bookings
        </h3>

        <div className="space-y-3">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {service.service_type}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{service.service_description}</h4>
                {service.vendors && (
                  <p className="text-sm text-gray-600">Vendor: {service.vendors.name}</p>
                )}
                {service.booking_confirmation && (
                  <p className="text-xs text-green-700 mt-1">
                    Confirmation: {service.booking_confirmation}
                  </p>
                )}
                {service.booked_date && (
                  <p className="text-xs text-gray-500">
                    Booked: {new Date(service.booked_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Cost Paid</div>
                  <div className="font-semibold text-gray-900">
                    Rs {((service.cost_price || 0) * (service.quantity || 1)).toLocaleString()}
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-800">
                  ✅ Confirmed
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Total Services Booked</div>
              <div className="text-2xl font-bold text-gray-900">{services.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-xs text-red-700 mb-1">Total Cost Paid to Vendors</div>
              <div className="text-2xl font-bold text-red-700">
                Rs{' '}
                {services
                  .reduce((sum, s) => sum + (s.cost_price || 0) * (s.quantity || 1), 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 mb-1">Package Value (Customer)</div>
              <div className="text-2xl font-bold text-blue-700">
                Rs{' '}
                {services
                  .reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0)
                  .toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Documents */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Booking Documents
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 text-center mb-4">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Booking vouchers and confirmations</p>
          <p className="text-sm text-gray-500 mb-4">
            {services.filter((s) => s.voucher_url).length} of {services.length} documents uploaded
          </p>
        </div>

        <button
          onClick={() => alert('Phase B: Download all booking documents as ZIP')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download All Booking Documents
        </button>
      </div>

      {/* Next Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready for Service Delivery?</h3>
        <p className="text-gray-600 mb-6">
          All bookings are confirmed. You can now start tracking service delivery as the customer
          begins their journey.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => alert('Phase B: Email booking documents to customer')}
            className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            📧 Email Documents to Customer
          </button>
          <button
            onClick={onStartDelivery}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Truck className="w-5 h-5" />
            Start Service Delivery Tracking
          </button>
        </div>
      </div>

      {/* Phase B Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-800">
          <strong>Phase B Integration:</strong> Full document management, customer communication, and
          automated delivery tracking will be available after Phase B integration.
        </p>
      </div>
    </div>
  );
}
