import { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VendorTransaction {
  id: string;
  vendor_id: string;
  purchase_amount_pkr: number;
  purchase_amount_original: number;
  amount_paid: number;
  currency: string;
}

interface Props {
  transaction: VendorTransaction;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Online Transfer',
  'Credit Card',
  'Other'
];

export default function RecordPaymentModal({ transaction, onClose, onSuccess }: Props) {
  const remainingAmount = transaction.purchase_amount_pkr - (transaction.amount_paid || 0);

  const [formData, setFormData] = useState({
    amount: remainingAmount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    payment_reference: '',
    receipt_url: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (formData.amount > remainingAmount) {
      alert(`Payment amount cannot exceed remaining balance of Rs ${remainingAmount.toLocaleString()}`);
      return;
    }

    setSaving(true);

    try {
      const newTotalPaid = (transaction.amount_paid || 0) + formData.amount;
      const newPaymentStatus =
        newTotalPaid >= transaction.purchase_amount_pkr
          ? 'PAID'
          : newTotalPaid > 0
          ? 'PARTIAL'
          : 'PENDING';

      // Update vendor transaction
      const { error } = await supabase
        .from('vendor_transactions')
        .update({
          amount_paid: newTotalPaid,
          payment_status: newPaymentStatus,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference,
          receipt_url: formData.receipt_url || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Record Payment to Vendor
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Total Amount</p>
              <p className="font-semibold text-gray-900">
                Rs {transaction.purchase_amount_pkr.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Already Paid</p>
              <p className="font-semibold text-gray-900">
                Rs {(transaction.amount_paid || 0).toLocaleString()}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t border-blue-200">
              <p className="text-gray-600">Remaining Balance</p>
              <p className="font-semibold text-blue-700 text-lg">
                Rs {remainingAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">Rs</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0.01"
                max={remainingAmount}
                step="0.01"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: remainingAmount })}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Pay Full Balance
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: remainingAmount / 2 })}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Pay 50%
              </button>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Reference / Transaction ID
            </label>
            <input
              type="text"
              value={formData.payment_reference}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., TXN-12345, CHQ-67890"
            />
          </div>

          {/* Receipt URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt/Proof URL (Optional)
            </label>
            <input
              type="url"
              value={formData.receipt_url}
              onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/receipt.pdf"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to uploaded receipt or payment proof
            </p>
          </div>

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
              placeholder="Additional payment details..."
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>Recording...</>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
