import React, { useState } from 'react';
import { X, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentMethod } from '../../types/proposals';
import { PAYMENT_METHODS } from '../../types/proposals';
import { formatCurrency } from '../../lib/proposalUtils';
import { finalizeQuery } from '../../lib/api/proposals';

interface FinalizePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  totalAmount: number;
  travelDate: string | null;
  onSuccess: () => void;
}

export default function FinalizePackageModal({
  isOpen,
  onClose,
  queryId,
  totalAmount,
  travelDate,
  onSuccess
}: FinalizePackageModalProps) {
  const [hasAdvancePayment, setHasAdvancePayment] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [internalNotes, setInternalNotes] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    setError(null);

    try {
      let advancePaymentData;

      if (hasAdvancePayment) {
        const amount = parseFloat(advanceAmount);
        if (isNaN(amount) || amount <= 0) {
          setError('Please enter a valid advance payment amount');
          setIsFinalizing(false);
          return;
        }

        if (amount > totalAmount) {
          setError('Advance payment cannot exceed total package amount');
          setIsFinalizing(false);
          return;
        }

        advancePaymentData = {
          amount,
          date: paymentDate,
          method: paymentMethod,
          notes: internalNotes.trim()
        };
      }

      await finalizeQuery(queryId, advancePaymentData);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error finalizing package:', err);
      setError('Failed to finalize package. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const advanceAmountNum = parseFloat(advanceAmount) || 0;
  const balanceRemaining = totalAmount - advanceAmountNum;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              Finalize Package
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Customer has accepted the proposal
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Package Summary */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Final Package Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Total Amount:</span>
                <span className="font-bold text-green-900 text-lg">{formatCurrency(totalAmount)}</span>
              </div>
              {travelDate && (
                <div className="flex justify-between">
                  <span className="text-green-700">Travel Date:</span>
                  <span className="font-medium text-green-900">
                    {format(new Date(travelDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Advance Payment */}
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={hasAdvancePayment}
                onChange={(e) => setHasAdvancePayment(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-base font-medium text-gray-900">
                Record Advance Payment
              </span>
            </label>

            {hasAdvancePayment && (
              <div className="ml-8 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Amount Received */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Received: *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      max={totalAmount}
                      className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500">Rs</span>
                    </div>
                  </div>
                  {advanceAmountNum > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Balance remaining: <span className="font-medium">{formatCurrency(balanceRemaining)}</span>
                    </p>
                  )}
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date: *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method: *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes:
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add any internal notes about the finalization, payment terms, or special conditions..."
            />
          </div>

          {/* Next Steps */}
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
            <h4 className="font-medium text-indigo-900 mb-2">Next Steps After Finalization:</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Query status will change to "Finalized & Booking"</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Proposal will be locked (no more changes without creating new query)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can link passengers to this query</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Start booking services with vendors</span>
              </li>
              {hasAdvancePayment && advanceAmountNum > 0 && (
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Advance payment will be recorded in the system</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            disabled={isFinalizing}
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            disabled={
              isFinalizing ||
              (hasAdvancePayment && (!advanceAmount || parseFloat(advanceAmount) <= 0))
            }
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isFinalizing ? 'Finalizing...' : 'Finalize & Start Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
