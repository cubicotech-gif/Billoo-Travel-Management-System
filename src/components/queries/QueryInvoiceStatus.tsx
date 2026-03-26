import { useState, useEffect } from 'react';
import { FileText, ExternalLink, Plus } from 'lucide-react';
import { checkExistingInvoice } from '../../lib/api/queries';
import { formatCurrency } from '../../lib/formatCurrency';
import type { Invoice } from '../../types/finance';

interface Props {
  queryId: string;
  onGenerateInvoice: () => void;
}

export default function QueryInvoiceStatus({ queryId, onGenerateInvoice }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [queryId]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const inv = await checkExistingInvoice(queryId);
      setInvoice(inv);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!invoice) {
    return (
      <button
        onClick={onGenerateInvoice}
        className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
        title="Generate Invoice"
      >
        <Plus className="w-4 h-4" />
        Invoice
      </button>
    );
  }

  const balance = invoice.amount - invoice.paid_amount;
  const statusColors: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    draft: 'bg-gray-50 text-gray-700 border-gray-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <button
      onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
      className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 border ${
        statusColors[invoice.status] || 'bg-gray-50 text-gray-700 border-gray-200'
      } hover:opacity-80`}
      title={`Invoice ${invoice.invoice_number} — ${invoice.status} — Balance: ${formatCurrency(balance)}`}
    >
      <FileText className="w-4 h-4" />
      {invoice.invoice_number}
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}
