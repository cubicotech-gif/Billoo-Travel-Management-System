import { useState } from 'react';
import { Edit, AlertTriangle } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import ServiceAddModal from '../ServiceAddModal';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onSendRevised: () => void;
}

export default function StageRevisions({ query, services, onRefresh, onSendRevised }: Props) {
  const [showAddService, setShowAddService] = useState(false);

  const handleServiceAdded = () => {
    setShowAddService(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-amber-600 text-white p-3 rounded-lg">
            <Edit className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              ⚠️ Customer Requested Changes
            </h3>
            <p className="text-sm text-amber-700">
              The customer reviewed the proposal and requested modifications.
              Update the services based on their feedback and resend the proposal.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Feedback */}
      <div className="bg-white rounded-lg border border-amber-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Customer Feedback
        </h3>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {query.customer_feedback || 'No specific feedback provided. Contact customer for details.'}
          </p>
        </div>
      </div>

      {/* Edit Services */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Package Services</h3>
        <p className="text-gray-600 mb-4">
          Make changes based on customer feedback. You can modify existing services or add new ones.
        </p>

        <div className="space-y-3 mb-6">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {service.service_type}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">{service.service_description}</h4>
                {service.vendors && (
                  <p className="text-sm text-gray-600">Vendor: {service.vendors.name}</p>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  Rs {((service.selling_price || 0) * (service.quantity || 1)).toLocaleString()}
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Services */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowAddService(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add More Services
          </button>
        </div>
      </div>

      {/* Package Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Updated Package Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Services Count</div>
            <div className="text-2xl font-bold text-gray-900">{services.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Total Package Price</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs{' '}
              {services
                .reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0)
                .toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Expected Profit</div>
            <div className="text-2xl font-bold text-green-700">
              Rs{' '}
              {(
                services.reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0) -
                services.reduce((sum, s) => sum + (s.cost_price || 0) * (s.quantity || 1), 0)
              ).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Ready to send revised proposal?</h3>
            <p className="text-sm text-gray-600">
              Send the updated package proposal back to the customer
            </p>
          </div>
          <button
            onClick={onSendRevised}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            📧 Send Revised Proposal
          </button>
        </div>
      </div>

      {/* Service Add Modal */}
      {showAddService && (
        <ServiceAddModal
          queryId={query.id}
          onClose={() => setShowAddService(false)}
          onSuccess={handleServiceAdded}
        />
      )}
    </div>
  );
}
