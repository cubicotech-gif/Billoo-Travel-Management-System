import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { getQueryPayments, getQueryFinancialSummary } from '../../lib/api/queries';
import { formatCurrency } from '../../lib/formatCurrency';
import { PAYMENT_METHOD_LABELS } from '../../types/finance';

interface Props {
  queryId: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference_number: string | null;
  transaction_date: string;
  description: string | null;
  receipt_url: string | null;
  original_amount: number | null;
  original_currency: string | null;
  exchange_rate: number | null;
  transaction_number: string;
  passengers: { first_name: string; last_name: string } | null;
}

interface FinancialSummary {
  totalCost: number;
  totalSelling: number;
  profit: number;
  advanceReceived: number;
  pendingFromClient: number;
}

export default function QueryPaymentSummary({ queryId }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [queryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        getQueryPayments(queryId),
        getQueryFinancialSummary(queryId),
      ]);
      setPayments(paymentsData as Payment[]);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading payment summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Payment Summary
        </h3>
        <button
          onClick={loadData}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Financial Overview Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Package Value</div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(summary.totalSelling)}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Advance Received</div>
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(summary.advanceReceived)}
            </div>
          </div>
          <div className={`rounded-lg p-3 border ${
            summary.pendingFromClient > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className={`text-xs mb-1 ${
              summary.pendingFromClient > 0 ? 'text-amber-700' : 'text-green-700'
            }`}>
              Pending from Client
            </div>
            <div className={`text-lg font-bold ${
              summary.pendingFromClient > 0 ? 'text-amber-900' : 'text-green-900'
            }`}>
              {formatCurrency(summary.pendingFromClient)}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-purple-700 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Profit
            </div>
            <div className="text-lg font-bold text-purple-900">
              {formatCurrency(summary.profit)}
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </span>
                    {payment.original_currency && payment.original_currency !== 'PKR' && (
                      <span className="text-xs text-gray-500">
                        ({payment.original_amount} {payment.original_currency})
                      </span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                      {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {payment.passengers
                      ? `${payment.passengers.first_name} ${payment.passengers.last_name}`
                      : 'Unknown'}{' '}
                    &middot; {new Date(payment.transaction_date).toLocaleDateString()}{' '}
                    &middot; {payment.transaction_number}
                    {payment.reference_number && ` · Ref: ${payment.reference_number}`}
                  </div>
                </div>
                {payment.receipt_url && (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="View Receipt"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-500">
          No advance payments recorded yet.
        </div>
      )}
    </div>
  );
}
