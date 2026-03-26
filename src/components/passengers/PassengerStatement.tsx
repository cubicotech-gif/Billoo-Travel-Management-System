import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'

interface StatementTransaction {
  id: string
  transaction_date: string
  transaction_number: string
  type: string
  direction: string
  amount: number
  description: string | null
  payment_method: string | null
  original_amount: number | null
  original_currency: string | null
  exchange_rate: number | null
}

interface StatementInvoice {
  id: string
  invoice_number: string
  amount: number
  paid_amount: number
  status: string
  created_at: string
}

interface PassengerStatementProps {
  passengerName: string
  passengerPhone: string
  passengerEmail: string | null
  transactions: StatementTransaction[]
  invoices: StatementInvoice[]
  totalBilled: number
  totalPaid: number
  creditBalance: number
  onClose: () => void
}

export default function PassengerStatement({
  passengerName, passengerPhone, passengerEmail,
  transactions, invoices,
  totalBilled, totalPaid, creditBalance,
  onClose,
}: PassengerStatementProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const outstanding = totalBilled - totalPaid

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement - ${passengerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; padding: 40px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
          .header h1 { color: #1a365d; font-size: 24px; margin-bottom: 4px; }
          .header p { color: #718096; font-size: 12px; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .info-block p { margin-bottom: 2px; }
          .info-label { color: #718096; font-size: 11px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .summary-box { padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; }
          .summary-box .value { font-size: 18px; font-weight: 700; }
          .summary-box .label { font-size: 11px; color: #718096; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f7fafc; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e2e8f0; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-green { color: #38a169; }
          .text-red { color: #e53e3e; }
          .text-blue { color: #3182ce; }
          .section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #1a365d; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // Build ledger: invoices as debits, payment_received as credits
  const ledgerEntries: { date: string; description: string; debit: number; credit: number; ref: string }[] = []

  const sortedInvoices = [...invoices].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  for (const inv of sortedInvoices) {
    ledgerEntries.push({
      date: inv.created_at,
      description: `Invoice ${inv.invoice_number}`,
      debit: inv.amount,
      credit: 0,
      ref: inv.invoice_number,
    })
  }

  const paymentTxns = [...transactions]
    .filter(t => t.type === 'payment_received')
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

  for (const txn of paymentTxns) {
    ledgerEntries.push({
      date: txn.transaction_date,
      description: txn.description || 'Payment Received',
      debit: 0,
      credit: txn.amount,
      ref: txn.transaction_number,
    })
  }

  const refundTxns = [...transactions]
    .filter(t => t.type === 'refund_to_client')
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

  for (const txn of refundTxns) {
    ledgerEntries.push({
      date: txn.transaction_date,
      description: txn.description || 'Refund Issued',
      debit: 0,
      credit: -txn.amount,
      ref: txn.transaction_number,
    })
  }

  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Account Statement</h3>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                <Printer className="w-4 h-4 mr-1" /> Print
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div ref={printRef} className="px-8 py-6">
            <div className="header">
              <h1>Billoo Travel Management</h1>
              <p>Account Statement</p>
              <p>Generated on {format(new Date(), 'dd MMMM yyyy')}</p>
            </div>

            <div className="info-grid" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div className="info-block">
                <p className="info-label">Passenger</p>
                <p style={{ fontWeight: 600 }}>{passengerName}</p>
                <p>{passengerPhone}</p>
                {passengerEmail && <p>{passengerEmail}</p>}
              </div>
              <div className="info-block" style={{ textAlign: 'right' }}>
                <p className="info-label">Statement Period</p>
                <p>All transactions to date</p>
                <p className="info-label" style={{ marginTop: '4px' }}>Total Invoices</p>
                <p>{invoices.length}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div className="summary-box" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                <div className="value">{formatCurrency(totalBilled)}</div>
                <div className="label" style={{ fontSize: '11px', color: '#718096' }}>Total Billed</div>
              </div>
              <div className="summary-box" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                <div className="value text-green" style={{ color: '#38a169' }}>{formatCurrency(totalPaid)}</div>
                <div className="label" style={{ fontSize: '11px', color: '#718096' }}>Total Paid</div>
              </div>
              <div className="summary-box" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                <div className="value" style={{ color: outstanding > 0 ? '#e53e3e' : '#718096' }}>{formatCurrency(outstanding)}</div>
                <div className="label" style={{ fontSize: '11px', color: '#718096' }}>Outstanding</div>
              </div>
              <div className="summary-box" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                <div className="value text-blue" style={{ color: '#3182ce' }}>{formatCurrency(creditBalance)}</div>
                <div className="label" style={{ fontSize: '11px', color: '#718096' }}>Credit Balance</div>
              </div>
            </div>

            {/* Ledger */}
            <div className="section-title" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a365d' }}>
              Account Ledger
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Ref</th>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
                  <th style={{ background: '#f7fafc', padding: '8px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, i) => {
                  runningBalance += entry.debit - entry.credit
                  return (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                        {format(new Date(entry.date), 'dd MMM yyyy')}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '11px' }}>
                        {entry.ref}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                        {entry.description}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#e53e3e' }}>
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#38a169' }}>
                        {entry.credit > 0 ? formatCurrency(entry.credit) : entry.credit < 0 ? `(${formatCurrency(Math.abs(entry.credit))})` : ''}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: runningBalance > 0 ? '#e53e3e' : '#1a202c' }}>
                        {formatCurrency(Math.abs(runningBalance))}
                        {runningBalance < 0 ? ' CR' : runningBalance > 0 ? ' DR' : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="footer" style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#a0aec0', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              This is a computer-generated statement and does not require a signature.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
