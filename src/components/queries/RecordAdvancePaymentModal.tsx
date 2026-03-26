import { useState, useEffect } from 'react';
import { X, DollarSign, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { recordAdvancePayment } from '../../lib/api/queries';
import { uploadFile } from '../../lib/storage';
import { formatCurrency, convertToPKR, type CurrencyCode } from '../../lib/formatCurrency';
import type { PaymentMethod } from '../../types/finance';

const CURRENCIES: CurrencyCode[] = ['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP'];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' },
];

interface QueryPassenger {
  id: string;
  passenger_id: string;
  passengers: { id: string; first_name: string; last_name: string };
}

interface Props {
  queryId: string;
  queryNumber: string;
  destination: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordAdvancePaymentModal({
  queryId, queryNumber, destination, onClose, onSuccess,
}: Props) {
  const [passengers, setPassengers] = useState<QueryPassenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [passengerId, setPassengerId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('PKR');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    loadPassengers();
  }, [queryId]);

  const loadPassengers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('query_passengers')
      .select('id, passenger_id, passengers (id, first_name, last_name)')
      .eq('query_id', queryId);
    setPassengers((data as unknown as QueryPassenger[]) || []);
    if (data && data.length === 1) {
      setPassengerId((data[0] as unknown as QueryPassenger).passengers.id);
    }
    setLoading(false);
  };

  const isPKR = currency === 'PKR';
  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(exchangeRate) || 1;
  const amountPkr = isPKR ? numAmount : convertToPKR(numAmount, numRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerId) return alert('Please select a passenger');
    if (numAmount <= 0) return alert('Please enter a valid amount');

    setSubmitting(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const result = await uploadFile(receiptFile, 'query', queryId);
        if (result) receiptUrl = result.url;
      }

      await recordAdvancePayment(queryId, queryNumber, destination, {
        passenger_id: passengerId,
        amount: numAmount,
        currency,
        exchange_rate: isPKR ? 1 : numRate,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        receipt_url: receiptUrl,
      });

      onSuccess();
    } catch (err: any) {
      alert('Failed to record payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 text-white p-2 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Record Advance Payment</h2>
              <p className="text-xs text-gray-600">Query #{queryNumber} — {destination}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Passenger Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passenger *</label>
            {loading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : passengers.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                No passengers linked to this query. Add passengers first.
              </div>
            ) : (
              <select
                value={passengerId}
                onChange={(e) => setPassengerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select passenger...</option>
                {passengers.map((qp) => (
                  <option key={qp.passengers.id} value={qp.passengers.id}>
                    {qp.passengers.first_name} {qp.passengers.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <div className="flex flex-wrap gap-1">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCurrency(c);
                      if (c === 'PKR') setExchangeRate('1');
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      currency === c
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROE */}
          {!isPKR && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    Exchange Rate (1 {currency} = ? PKR)
                  </label>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    required
                  />
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-700">PKR Equivalent</div>
                  <div className="text-lg font-bold text-amber-900">
                    {formatCurrency(amountPkr)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Bank ref, cheque #, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {receiptFile ? receiptFile.name : 'Upload receipt image or PDF'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional payment notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary */}
          {numAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-800">
                <strong>Payment Summary:</strong> {formatCurrency(amountPkr)} will be recorded as an
                advance payment from the selected passenger for Query #{queryNumber}.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !passengerId || numAmount <= 0}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
