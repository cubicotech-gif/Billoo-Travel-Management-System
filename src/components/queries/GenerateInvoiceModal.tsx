import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Query, QueryService } from '../../types/query-workflow';
import { Invoice } from '../../types/finance';
import {
  checkExistingInvoice,
  generateInvoiceFromQuery,
  updateInvoiceFromQuery,
  InvoiceGenerationResult,
} from '../../lib/api/queries';
import { formatCurrency, type CurrencyCode } from '../../lib/formatCurrency';
import { supabase } from '../../lib/supabase';

interface Props {
  query: Query;
  services: QueryService[];
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

type ModalState = 'loading' | 'preview' | 'existing' | 'generating' | 'success' | 'error';

export default function GenerateInvoiceModal({ query, services, onClose, onSuccess }: Props) {
  const [state, setState] = useState<ModalState>('loading');
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);
  const [result, setResult] = useState<InvoiceGenerationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [primaryPassengerName, setPrimaryPassengerName] = useState('');
  const [advancePaymentTotal, setAdvancePaymentTotal] = useState(0);
  const [newServicesCount, setNewServicesCount] = useState(0);

  useEffect(() => {
    checkState();
  }, []);

  const checkState = async () => {
    setState('loading');
    try {
      // Check for existing invoice
      const existing = await checkExistingInvoice(query.id);
      setExistingInvoice(existing);

      // Load primary passenger name
      const { data: qPassengers } = await supabase
        .from('query_passengers')
        .select('is_primary, passengers (first_name, last_name)')
        .eq('query_id', query.id)
        .order('is_primary', { ascending: false });

      const primary = qPassengers?.[0] as any;
      if (primary?.passengers) {
        setPrimaryPassengerName(`${primary.passengers.first_name} ${primary.passengers.last_name}`);
      }

      // Load advance payments total
      const { data: payments } = await supabase
        .from('transactions')
        .select('amount')
        .eq('source_reference_type', 'query')
        .eq('source_reference_id', query.id)
        .eq('type', 'payment_received');
      setAdvancePaymentTotal((payments || []).reduce((s, p) => s + (p.amount || 0), 0));

      if (existing) {
        // Check if there are new services not on the invoice
        const { data: existingItems } = await supabase
          .from('invoice_items')
          .select('service_id')
          .eq('invoice_id', existing.id);
        const existingIds = new Set((existingItems || []).map(i => i.service_id).filter(Boolean));
        const newCount = services.filter(s => !existingIds.has(s.id)).length;
        setNewServicesCount(newCount);
        setState('existing');
      } else {
        setState('preview');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  const handleGenerate = async () => {
    setState('generating');
    try {
      const res = await generateInvoiceFromQuery(query.id);
      setResult(res);
      setState('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  const handleUpdate = async () => {
    if (!existingInvoice) return;
    setState('generating');
    try {
      const { added } = await updateInvoiceFromQuery(query.id, existingInvoice.id);
      setErrorMsg(''); // clear any prev error
      if (added > 0) {
        alert(`${added} new service(s) added to invoice ${existingInvoice.invoice_number}`);
      } else {
        alert('No new services to add. Invoice is up to date.');
      }
      onSuccess(existingInvoice.id);
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  // Calculate totals for preview
  const totalSellingPkr = services.reduce(
    (sum, s) => sum + (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1), 0
  );
  const totalCostPkr = services.reduce(
    (sum, s) => sum + (s.cost_price_pkr || s.cost_price || 0) * (s.quantity || 1), 0
  );
  const totalPax = query.adults + query.children + query.infants;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate Invoice</h2>
              <p className="text-xs text-gray-600">Query #{query.query_number} — {query.destination}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Loading */}
          {state === 'loading' && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Checking invoice status...</p>
            </div>
          )}

          {/* Preview — No existing invoice */}
          {state === 'preview' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Query Finalized!</span>
                </div>
                <p className="text-sm text-green-700">
                  Would you like to generate an invoice for this query?
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">This will create:</h4>
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-900">
                    1 invoice for {primaryPassengerName || query.client_name}
                    {totalPax > 0 && ` (${totalPax} pax)`}
                  </div>
                </div>

                {/* Service items preview */}
                <div className="space-y-2 mb-4">
                  {services.map((s) => {
                    const cur = (s.currency || 'PKR') as CurrencyCode;
                    const isForeign = cur !== 'PKR';
                    const sellingPkr = (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1);
                    const sellingOriginal = (s.selling_price || 0) * (s.quantity || 1);

                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                        <div className="flex-1">
                          <span className="text-gray-500">{s.service_type}:</span>{' '}
                          <span className="font-medium text-gray-900">{s.service_description}</span>
                          {(s.quantity || 1) > 1 && <span className="text-gray-500"> x{s.quantity}</span>}
                        </div>
                        <div className="text-right">
                          {isForeign && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(sellingOriginal, cur)}
                            </div>
                          )}
                          <div className="font-medium text-gray-900">{formatCurrency(sellingPkr)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Package:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(totalSellingPkr)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="text-red-700">{formatCurrency(totalCostPkr)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Profit:</span>
                    <span className="text-green-700 font-semibold">
                      {formatCurrency(totalSellingPkr - totalCostPkr)}
                    </span>
                  </div>
                </div>

                {advancePaymentTotal > 0 && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                    Advance payment of {formatCurrency(advancePaymentTotal)} will be auto-linked.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Skip — I'll do it manually
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={services.length === 0}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </div>
          )}

          {/* Existing Invoice Found */}
          {state === 'existing' && existingInvoice && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Invoice Already Exists</span>
                </div>
                <p className="text-sm text-amber-700">
                  Invoice <strong>{existingInvoice.invoice_number}</strong> was already generated for this query.
                  {existingInvoice.status && (
                    <> Status: <strong>{existingInvoice.status}</strong>.</>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-medium">{existingInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(existingInvoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-medium text-green-700">{formatCurrency(existingInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium text-amber-700">
                    {formatCurrency(existingInvoice.amount - existingInvoice.paid_amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    window.open(`/invoices/${existingInvoice.id}`, '_blank');
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Invoice
                </button>
                {newServicesCount > 0 && (
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Add {newServicesCount} New Service{newServicesCount > 1 ? 's' : ''}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Generating */}
          {state === 'generating' && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Generating invoice...</p>
              <p className="text-sm text-gray-500 mt-1">Creating items and linking payments</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900 mb-1">Invoice Generated!</h3>
                <p className="text-sm text-green-700">
                  Invoice <strong>{result.invoice.invoice_number}</strong> has been created
                  with {result.items.length} line item{result.items.length !== 1 ? 's' : ''}.
                </p>
                {result.linkedPayments > 0 && (
                  <p className="text-sm text-green-700 mt-1">
                    {result.linkedPayments} advance payment{result.linkedPayments !== 1 ? 's' : ''} auto-linked.
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Amount:</span>
                  <span className="font-bold">{formatCurrency(result.invoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="text-red-700">{formatCurrency(result.invoice.total_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit:</span>
                  <span className="text-green-700 font-semibold">{formatCurrency(result.invoice.total_profit)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    window.open(`/invoices/${result.invoice.id}`, '_blank');
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Invoice
                </button>
                <button
                  onClick={() => onSuccess(result.invoice.id)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Error</span>
                </div>
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={checkState}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
