import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DollarSign, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { getQueryVendorTransactions } from '../../../lib/api/booking';

interface VendorPaymentSummaryProps {
  queryId: string;
  className?: string;
}

export default function VendorPaymentSummary({ queryId, className = '' }: VendorPaymentSummaryProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [queryId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getQueryVendorTransactions(queryId);
      setTransactions(data);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load vendor payments');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalToPay = transactions.reduce((sum, tx) => sum + tx.purchase_amount_pkr, 0);
    const totalPaid = transactions.reduce((sum, tx) => {
      return sum + (tx.payment_status === 'PAID' ? tx.amount_paid : 0);
    }, 0);
    const pending = totalToPay - totalPaid;

    return { totalToPay, totalPaid, pending };
  };

  const groupByVendor = () => {
    const grouped: Record<string, any[]> = {};

    transactions.forEach(tx => {
      const vendorId = tx.vendor_id;
      if (!grouped[vendorId]) {
        grouped[vendorId] = [];
      }
      grouped[vendorId].push(tx);
    });

    return grouped;
  };

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendor Payments Summary</h3>
        <p className="text-sm text-gray-600">No vendor payments recorded yet.</p>
      </div>
    );
  }

  const { totalToPay, totalPaid, pending } = calculateSummary();
  const vendorGroups = groupByVendor();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Payments Summary</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Total to Pay Vendors</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Rs {totalToPay.toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Total Paid</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            Rs {totalPaid.toLocaleString()}
          </div>
        </div>

        <div className={`${pending > 0 ? 'bg-amber-50' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className={`flex items-center gap-2 text-sm mb-1 ${pending > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
            {pending > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>Pending</span>
          </div>
          <div className={`text-2xl font-bold ${pending > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            Rs {pending.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Payments by Vendor */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Payments by Vendor</h4>

        {Object.entries(vendorGroups).map(([vendorId, vendorTransactions]) => {
          const vendor = vendorTransactions[0]?.vendors;
          const vendorTotal = vendorTransactions.reduce((sum, tx) => sum + tx.purchase_amount_pkr, 0);
          const vendorPaid = vendorTransactions.reduce((sum, tx) => {
            return sum + (tx.payment_status === 'PAID' ? tx.amount_paid : 0);
          }, 0);

          return (
            <div key={vendorId} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="font-semibold text-gray-900">{vendor?.name || 'Unknown Vendor'}</h5>
                  <p className="text-xs text-gray-500">{vendor?.type}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    Rs {vendorTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>

              <div className="space-y-2">
                {vendorTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm"
                  >
                    <div className="flex-1">
                      <div className="text-gray-900">{tx.service_description}</div>
                      <div className="text-xs text-gray-500">
                        {tx.city && `${tx.city} • `}
                        Rs {tx.purchase_amount_pkr.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {tx.payment_status === 'PAID' ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Paid</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-700">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}

                      {tx.payment_date && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(tx.payment_date), 'MMM dd')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vendor Payment Summary */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">Vendor Total:</span>
                <div className="flex items-center gap-4">
                  <span className={vendorPaid === vendorTotal ? 'text-green-700 font-semibold' : 'text-gray-900'}>
                    {vendorPaid === vendorTotal ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Fully Paid
                      </span>
                    ) : (
                      `Rs ${vendorPaid.toLocaleString()} / ${vendorTotal.toLocaleString()}`
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <a
          href={`/vendors/transactions?query_id=${queryId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          <span>View All Vendor Transactions</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
