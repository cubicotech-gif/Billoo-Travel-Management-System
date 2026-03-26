import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import type { Invoice, InvoiceItem } from '@/types/finance'

interface InvoicePrintViewProps {
  invoice: Invoice
  items: InvoiceItem[]
  onClose: () => void
}

export default function InvoicePrintView({ invoice, items, onClose }: InvoicePrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const passengerName = invoice.passengers
    ? `${invoice.passengers.first_name} ${invoice.passengers.last_name}`
    : 'N/A'
  const balance = invoice.amount - invoice.paid_amount

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; padding: 40px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
          .header h1 { color: #1a365d; font-size: 24px; margin-bottom: 4px; }
          .header p { color: #718096; font-size: 12px; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f7fafc; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #f7fafc; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          .payment-section { margin-bottom: 24px; padding: 16px; background: #f7fafc; border-radius: 8px; }
          @media print { body { padding: 20px; } }
        </style>
      </head><body>${content.innerHTML}</body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Preview</h3>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                <Printer className="w-4 h-4 mr-1" /> Print
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div ref={printRef} className="px-8 py-6">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #1a365d', paddingBottom: '20px' }}>
              <h1 style={{ color: '#1a365d', fontSize: '24px', marginBottom: '4px' }}>Billoo Travel Management</h1>
              <p style={{ color: '#718096', fontSize: '14px', fontWeight: 600 }}>INVOICE</p>
              <p style={{ color: '#718096', fontSize: '12px' }}>{invoice.invoice_number}</p>
            </div>

            {/* Invoice Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <p style={{ color: '#718096', fontSize: '11px', textTransform: 'uppercase' }}>Bill To</p>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{passengerName}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#718096', fontSize: '11px', textTransform: 'uppercase' }}>Invoice Details</p>
                <p style={{ fontSize: '12px' }}>Date: {format(new Date(invoice.created_at), 'dd MMMM yyyy')}</p>
                {invoice.due_date && (
                  <p style={{ fontSize: '12px' }}>Due: {format(new Date(invoice.due_date), 'dd MMMM yyyy')}</p>
                )}
                <p style={{ fontSize: '12px' }}>Currency: {invoice.currency}</p>
              </div>
            </div>

            {/* Line Items - Client-facing: NO cost/purchase prices */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr>
                  {['#', 'Description', 'Type', 'Qty', 'Unit Price', 'Amount'].map(h => (
                    <th key={h} style={{
                      background: '#f7fafc', padding: '10px 12px',
                      textAlign: ['Qty', 'Unit Price', 'Amount'].includes(h) ? 'right' : 'left',
                      fontSize: '11px', textTransform: 'uppercase', color: '#718096',
                      borderBottom: '2px solid #e2e8f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{item.description}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{item.service_type || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, borderTop: '2px solid #e2e8f0' }}>Subtotal</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>{formatCurrency(invoice.amount)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment Summary */}
            <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Total Amount</span>
                <strong>{formatCurrency(invoice.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#38a169' }}>
                <span>Amount Paid</span>
                <strong>{formatCurrency(invoice.paid_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '14px' }}>
                <strong style={{ color: balance > 0 ? '#e53e3e' : '#38a169' }}>Balance Due</strong>
                <strong style={{ color: balance > 0 ? '#e53e3e' : '#38a169' }}>{formatCurrency(balance)}</strong>
              </div>
            </div>

            {/* ROE info if applicable */}
            {invoice.original_currency && invoice.original_currency !== 'PKR' && invoice.exchange_rate && (
              <div style={{ padding: '12px', background: '#ebf8ff', borderRadius: '8px', marginBottom: '24px', fontSize: '12px', color: '#2b6cb0' }}>
                Exchange Rate: 1 {invoice.original_currency} = {invoice.exchange_rate} PKR
                {invoice.original_amount && (
                  <span style={{ marginLeft: '16px' }}>
                    Original Amount: {invoice.original_currency} {invoice.original_amount.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {invoice.notes && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</p>
                <p style={{ fontSize: '12px', color: '#4a5568' }}>{invoice.notes}</p>
              </div>
            )}

            <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#a0aec0', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              This is a computer-generated invoice and does not require a signature.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
