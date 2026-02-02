import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import ServiceAddModal from '../ServiceAddModal';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onSendProposal: () => void;
}

export default function StageServiceBuilding({
  query,
  services,
  onRefresh,
  onSendProposal
}: Props) {
  const [showAddService, setShowAddService] = useState(false);

  const totalCost = services.reduce((sum, s) => sum + (s.cost_price || 0) * (s.quantity || 1), 0);
  const totalSelling = services.reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0);
  const totalProfit = totalSelling - totalCost;
  const profitMargin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

  const handleServiceAdded = () => {
    setShowAddService(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-600 text-white p-3 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Building Package Proposal
            </h3>
            <p className="text-sm text-blue-700">
              Add services (hotels, flights, transport, activities) to create the customer's travel package.
              Once all services are added, you can send the complete proposal to the customer.
            </p>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Package Services ({services.length})
          </h3>
          <div className="flex items-center gap-3">
            {services.length > 0 && (
              <button
                onClick={() => setShowAddService(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            )}
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No services added yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Add services to build the customer's travel package
            </p>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowAddService(true)}
            >
              <Plus className="w-4 h-4" />
              Add First Service
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-semibold text-gray-500">
                      #{index + 1}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {service.service_type}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {service.service_description}
                  </h4>
                  {service.vendors && (
                    <p className="text-sm text-gray-600">
                      Vendor: {service.vendors.name}
                    </p>
                  )}
                  {service.service_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Date: {new Date(service.service_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Cost → Selling</div>
                  <div className="font-semibold text-gray-900">
                    Rs {((service.cost_price || 0) * (service.quantity || 1)).toLocaleString()}
                    {' → '}
                    Rs {((service.selling_price || 0) * (service.quantity || 1)).toLocaleString()}
                  </div>
                  {service.quantity && service.quantity > 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Qty: {service.quantity}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Package Summary */}
      {services.length > 0 && (
        <>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Cost Price</div>
                <div className="text-2xl font-bold text-gray-900">
                  Rs {totalCost.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Selling Price</div>
                <div className="text-2xl font-bold text-gray-900">
                  Rs {totalSelling.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-xs text-green-700 mb-1">Expected Profit</div>
                <div className="text-2xl font-bold text-green-700">
                  Rs {totalProfit.toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-blue-700 mb-1">Profit Margin</div>
                <div className="text-2xl font-bold text-blue-700">
                  {profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Ready to send proposal?</h3>
                <p className="text-sm text-gray-600">
                  Send the complete package proposal to the customer for review
                </p>
              </div>
              <button
                onClick={onSendProposal}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                📧 Send Proposal to Customer
              </button>
            </div>
          </div>
        </>
      )}

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
