import { useState, useEffect } from 'react';
import { X, Package, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QuickAddVendorModal from './QuickAddVendorModal';
import ServiceDetailsForm from './ServiceDetailsForm';
import { SUPPORTED_CURRENCIES, type CurrencyCode, convertToPKR, formatCurrency } from '../../lib/formatCurrency';

interface Vendor {
  id: string;
  name: string;
  type: string;
  default_currency: string;
}

interface Props {
  queryId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_TYPES = [
  'Hotel',
  'Flight',
  'Transport',
  'Activity',
  'Guide',
  'Visa',
  'Insurance',
  'Other'
];

export default function ServiceAddModal({ queryId, onClose, onSuccess }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuickAddVendor, setShowQuickAddVendor] = useState(false);
  const [serviceDetails, setServiceDetails] = useState<any>({});

  const [formData, setFormData] = useState({
    service_type: 'Hotel',
    service_description: '',
    service_date: '',
    quantity: 1,
    cost_price: 0,
    selling_price: 0,
    vendor_id: '',
    notes: '',
    currency: 'SAR' as CurrencyCode,
    exchange_rate: 0,
  });

  // Derived PKR values
  const isPKR = formData.currency === 'PKR';
  const costPricePkr = isPKR ? formData.cost_price : convertToPKR(formData.cost_price, formData.exchange_rate);
  const sellingPricePkr = isPKR ? formData.selling_price : convertToPKR(formData.selling_price, formData.exchange_rate);
  const profitPkr = sellingPricePkr - costPricePkr;
  const profitOriginal = formData.selling_price - formData.cost_price;

  useEffect(() => {
    loadVendors();

    const handleVendorsUpdated = () => {
      loadVendors();
    };

    window.addEventListener('vendorsUpdated', handleVendorsUpdated);
    return () => {
      window.removeEventListener('vendorsUpdated', handleVendorsUpdated);
    };
  }, []);

  // Auto-set currency when vendor changes
  useEffect(() => {
    if (formData.vendor_id) {
      const vendor = vendors.find(v => v.id === formData.vendor_id);
      if (vendor?.default_currency) {
        const cur = vendor.default_currency as CurrencyCode;
        setFormData(prev => ({
          ...prev,
          currency: cur,
          exchange_rate: cur === 'PKR' ? 1 : prev.exchange_rate,
        }));
      }
    }
  }, [formData.vendor_id, vendors]);

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, type, default_currency')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      alert('Failed to load vendors. Please ensure the database migrations have been applied.');
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_description.trim()) {
      alert('Please enter a service description');
      return;
    }

    if (!formData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    if (!isPKR && (!formData.exchange_rate || formData.exchange_rate <= 0)) {
      alert('Please enter a valid exchange rate (ROE)');
      return;
    }

    if (sellingPricePkr < costPricePkr) {
      const confirmed = confirm(
        'Warning: Selling price is lower than cost price. This will result in a loss. Continue anyway?'
      );
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      const vendor = vendors.find(v => v.id === formData.vendor_id);
      if (!vendor) throw new Error('Vendor not found');

      const effectiveRate = isPKR ? 1 : formData.exchange_rate;

      // 1. Create query service with ROE columns
      const { data: service, error: serviceError } = await supabase
        .from('query_services')
        .insert({
          query_id: queryId,
          service_type: formData.service_type,
          service_description: formData.service_description,
          service_date: formData.service_date || null,
          quantity: formData.quantity,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price,
          vendor_id: formData.vendor_id,
          vendor: vendor.name,
          booking_status: 'pending',
          delivery_status: 'not_started',
          notes: formData.notes || null,
          service_details: serviceDetails,
          currency: formData.currency,
          exchange_rate: effectiveRate,
          cost_price_pkr: costPricePkr,
          selling_price_pkr: sellingPricePkr,
          profit_pkr: profitPkr,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // 2. Create vendor transaction with proper currency data
      const totalCostOriginal = formData.cost_price * formData.quantity;
      const totalCostPkr = costPricePkr * formData.quantity;
      const totalSellingOriginal = formData.selling_price * formData.quantity;
      const totalSellingPkr = sellingPricePkr * formData.quantity;

      const { error: transactionError } = await supabase
        .from('vendor_transactions')
        .insert({
          query_id: queryId,
          service_id: service.id,
          vendor_id: formData.vendor_id,
          service_description: formData.service_description,
          service_type: formData.service_type,
          purchase_amount_original: totalCostOriginal,
          purchase_amount_pkr: totalCostPkr,
          selling_amount_original: totalSellingOriginal,
          selling_amount_pkr: totalSellingPkr,
          currency: formData.currency,
          exchange_rate_to_pkr: effectiveRate,
          amount_paid: 0,
          payment_status: 'PENDING',
          transaction_type: 'SERVICE_BOOKING',
          transaction_date: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      onSuccess();
    } catch (error: any) {
      console.error('Error adding service:', error);
      alert('Failed to add service: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVendorAdded = () => {
    setShowQuickAddVendor(false);
    loadVendors();
    window.dispatchEvent(new Event('vendorsUpdated'));
  };

  const profitMarginPkr = sellingPricePkr > 0
    ? ((sellingPricePkr - costPricePkr) / sellingPricePkr) * 100
    : 0;

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === formData.currency)?.symbol || formData.currency;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Add Service to Package
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type *
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Description *
              </label>
              <textarea
                value={formData.service_description}
                onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="e.g., 5-star hotel in Dubai with breakfast included"
                required
              />
            </div>

            {/* Service-Type-Specific Details */}
            {formData.service_type && (
              <ServiceDetailsForm
                serviceType={formData.service_type}
                details={serviceDetails}
                onChange={setServiceDetails}
              />
            )}

            {/* Service Date and Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Date
                </label>
                <input
                  type="date"
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loadingVendors}
                >
                  <option value="">{loadingVendors ? 'Loading vendors...' : 'Select vendor...'}</option>
                  {vendors.length === 0 && !loadingVendors && (
                    <option value="" disabled>No vendors found - add one using "New" button</option>
                  )}
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.type}) - {vendor.default_currency}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowQuickAddVendor(true)}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                  title="Add new vendor"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      currency: cur.code as CurrencyCode,
                      exchange_rate: cur.code === 'PKR' ? 1 : formData.exchange_rate,
                    })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      formData.currency === cur.code
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {cur.code}
                  </button>
                ))}
              </div>
            </div>

            {/* ROE Field (only for foreign currencies) */}
            {!isPKR && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-amber-800 mb-2">
                  Exchange Rate (ROE) — 1 {formData.currency} = ? PKR *
                </label>
                <input
                  type="number"
                  value={formData.exchange_rate || ''}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  min="0"
                  step="0.0001"
                  placeholder={`e.g., 74.5 (1 ${formData.currency} = 74.5 PKR)`}
                  required
                />
              </div>
            )}

            {/* Cost and Selling Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Price ({formData.currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">What you pay to vendor</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price ({formData.currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">What customer pays</p>
              </div>
            </div>

            {/* PKR Auto-Calculated (for foreign currencies) */}
            {!isPKR && formData.exchange_rate > 0 && (formData.cost_price > 0 || formData.selling_price > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">PKR Equivalents (Auto-calculated)</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600">Cost (PKR):</span>
                    <div className="font-semibold text-blue-900">{formatCurrency(costPricePkr)}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">Selling (PKR):</span>
                    <div className="font-semibold text-blue-900">{formatCurrency(sellingPricePkr)}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">Profit (PKR):</span>
                    <div className={`font-semibold ${profitPkr >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(profitPkr)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profit Indicator */}
            {formData.cost_price > 0 && formData.selling_price > 0 && (
              <div className={`p-3 rounded-lg border ${
                profitOriginal >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={profitOriginal >= 0 ? 'text-green-800' : 'text-red-800'}>
                    Profit per unit: {formatCurrency(profitOriginal, formData.currency)}
                  </span>
                  <span className={`font-semibold ${profitOriginal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    Margin: {profitMarginPkr.toFixed(1)}%
                  </span>
                </div>
                {formData.quantity > 1 && (
                  <div className="mt-1 text-sm">
                    <span className={profitOriginal >= 0 ? 'text-green-700' : 'text-red-700'}>
                      Total profit: {formatCurrency(profitOriginal * formData.quantity, formData.currency)}
                      {!isPKR && formData.exchange_rate > 0 && (
                        <span className="text-gray-500 ml-1">
                          ({formatCurrency(profitPkr * formData.quantity)})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Additional details..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>Adding...</>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Add Service
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Add Vendor Modal */}
      {showQuickAddVendor && (
        <QuickAddVendorModal
          prefilledType={formData.service_type}
          onClose={() => setShowQuickAddVendor(false)}
          onVendorAdded={handleVendorAdded}
        />
      )}
    </>
  );
}
