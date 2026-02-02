import { useState, useEffect } from 'react';
import { DollarSign, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Props {
  queryId: string;
}

interface VendorTransaction {
  id: string;
  vendor_id: string;
  service_description: string;
  purchase_amount_pkr: number;
  amount_paid: number;
  payment_status: string;
  currency: string;
  purchase_amount_original: number;
  vendors?: {
    name: string;
    type: string;
  };
}

export default function QueryVendorPaymentSummary({ queryId }: Props) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<VendorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalDue: 0,
    totalPaid: 0,
    totalPending: 0
  });

  useEffect(() => {
    loadTransactions();
  }, [queryId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          *,
          vendors (name, type)
        `)
        .eq('query_id', queryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate summary
      const totalDue = data?.reduce((sum, t) => sum + (t.purchase_amount_pkr || 0), 0) || 0;
      const totalPaid = data?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0;
      const totalPending = totalDue - totalPaid;

      setSummary({ totalDue, totalPaid, totalPending });
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Vendor Payments
        </h3>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No vendor payments for this query yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Payments will appear here when you assign vendors to services
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Vendor Payments Summary
        </h3>
        <button
          onClick={() => navigate('/vendors?tab=accounting')}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Full Ledger
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-600">Total to Pay Vendors</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            Rs {summary.totalDue.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">Total Paid</p>
          </div>
          <p className="text-2xl font-bold text-green-700">
            Rs {summary.totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {summary.totalDue > 0 ? `${((summary.totalPaid / summary.totalDue) * 100).toFixed(1)}% paid` : '0% paid'}
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-600">Pending</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            Rs {summary.totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transactions by Vendor */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Payments by Vendor</h4>
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{tx.vendors?.name || 'Unknown Vendor'}</p>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-500">{tx.vendors?.type}</span>
                </div>
                <p className="text-sm text-gray-600">{tx.service_description}</p>
                {tx.currency !== 'PKR' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {tx.purchase_amount_original} {tx.currency} = Rs {tx.purchase_amount_pkr?.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="text-right ml-4">
                <p className="font-semibold text-gray-900">
                  Rs {tx.purchase_amount_pkr?.toLocaleString()}
                </p>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                    tx.payment_status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : tx.payment_status === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tx.payment_status === 'PAID' ? '✅ Paid' :
                   tx.payment_status === 'PARTIAL' ? '🟡 Partial' :
                   '⏳ Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {summary.totalDue > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Payment Progress</span>
            <span className="font-semibold text-gray-900">
              {((summary.totalPaid / summary.totalDue) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(summary.totalPaid / summary.totalDue) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
