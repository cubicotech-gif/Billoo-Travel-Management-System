import { useState } from 'react';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import ServiceAddModal from '../ServiceAddModal';
import { formatCurrency, type CurrencyCode } from '../../../lib/formatCurrency';
import { deleteQueryService } from '../../../lib/api/queries';

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
  const [editingService, setEditingService] = useState<QueryService | null>(null);

  // Use PKR totals from services
  const totalCostPkr = services.reduce((sum, s) => sum + (s.cost_price_pkr || s.cost_price || 0) * (s.quantity || 1), 0);
  const totalSellingPkr = services.reduce((sum, s) => sum + (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1), 0);
  const totalProfitPkr = totalSellingPkr - totalCostPkr;
  const profitMargin = totalSellingPkr > 0 ? (totalProfitPkr / totalSellingPkr) * 100 : 0;

  const handleServiceAdded = () => {
    setShowAddService(false);
    setEditingService(null);
    onRefresh();
  };

  const handleDeleteService = async (service: QueryService) => {
    if (!confirm(`Delete ${service.service_type} — ${service.service_description}? This cannot be undone.`)) return;
    try {
      await deleteQueryService(service.id);
      onRefresh();
    } catch (err: any) {
      alert('Failed to delete service: ' + err.message);
    }
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
            {services.map((service, index) => {
              const cur = (service.currency || 'PKR') as CurrencyCode;
              const isForeign = cur !== 'PKR';
              const unitCostPkr = (service.cost_price_pkr || service.cost_price || 0) * (service.quantity || 1);
              const unitSellingPkr = (service.selling_price_pkr || service.selling_price || 0) * (service.quantity || 1);

              return (
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
                      {isForeign && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          {cur} @ {service.exchange_rate}
                        </span>
                      )}
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
                    {isForeign ? (
                      <>
                        <div className="text-sm text-gray-600">
                          {formatCurrency((service.cost_price || 0) * (service.quantity || 1), cur)}
                          {' → '}
                          {formatCurrency((service.selling_price || 0) * (service.quantity || 1), cur)}
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(unitCostPkr)} → {formatCurrency(unitSellingPkr)}
                        </div>
                      </>
                    ) : (
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(unitCostPkr)} → {formatCurrency(unitSellingPkr)}
                      </div>
                    )}
                    {service.quantity && service.quantity > 1 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Qty: {service.quantity}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      <button
                        onClick={() => { setEditingService(service); setShowAddService(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit service"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Package Summary */}
      {services.length > 0 && (
        <>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Summary (PKR)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Cost Price</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalCostPkr)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Selling Price</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalSellingPkr)}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-xs text-green-700 mb-1">Expected Profit</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(totalProfitPkr)}
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
                Send Proposal to Customer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Service Add Modal */}
      {showAddService && (
        <ServiceAddModal
          queryId={query.id}
          onClose={() => { setShowAddService(false); setEditingService(null); }}
          onSuccess={handleServiceAdded}
          editService={editingService}
        />
      )}
    </div>
  );
}
