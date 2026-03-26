import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import type { VendorLedgerEntry } from '@/lib/api/vendors'

interface VendorStatementProps {
  vendorName: string
  vendorPhone: string | null
  vendorEmail: string | null
  vendorContact: string | null
  ledgerEntries: VendorLedgerEntry[]
  totalOwed: number
  totalPaid: number
  balanceDue: number
  onClose: () => void
}

export default function VendorStatement({
  vendorName, vendorPhone, vendorEmail, vendorContact,
  ledgerEntries, totalOwed, totalPaid, balanceDue,
  onClose,
}: VendorStatementProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Statement - ${vendorName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; padding: 40px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #553C9A; padding-bottom: 20px; }
          .header h1 { color: #553C9A; font-size: 24px; margin-bottom: 4px; }
          .header p { color: #718096; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f7fafc; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e2e8f0; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head><body>${content.innerHTML}</body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  let runningBalance = 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Statement</h3>
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
            <div className="header" style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #553C9A', paddingBottom: '20px' }}>
              <h1 style={{ color: '#553C9A', fontSize: '24px', marginBottom: '4px' }}>Billoo Travel Management</h1>
              <p style={{ color: '#718096', fontSize: '12px' }}>Vendor Account Statement</p>
              <p style={{ color: '#718096', fontSize: '12px' }}>Generated on {format(new Date(), 'dd MMMM yyyy')}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <p style={{ color: '#718096', fontSize: '11px' }}>Vendor</p>
                <p style={{ fontWeight: 600 }}>{vendorName}</p>
                {vendorContact && <p>{vendorContact}</p>}
                {vendorPhone && <p>{vendorPhone}</p>}
                {vendorEmail && <p>{vendorEmail}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#718096', fontSize: '11px' }}>Account Summary</p>
                <p>Total Owed: <strong>{formatCurrency(totalOwed)}</strong></p>
                <p>Total Paid: <strong style={{ color: '#38a169' }}>{formatCurrency(totalPaid)}</strong></p>
                <p>Balance Due: <strong style={{ color: balanceDue > 0 ? '#e53e3e' : '#1a202c' }}>{formatCurrency(balanceDue)}</strong></p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr>
                  {['Date', 'Ref', 'Description', 'Passenger', 'Owed (+)', 'Paid (-)', 'Balance'].map(h => (
                    <th key={h} style={{ background: '#f7fafc', padding: '8px 12px', textAlign: h.includes('Owed') || h.includes('Paid') || h === 'Balance' ? 'right' : 'left', fontSize: '11px', textTransform: 'uppercase', color: '#718096', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, i) => {
                  runningBalance += entry.owed - entry.paid
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
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                        {entry.passengerName || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#e53e3e' }}>
                        {entry.owed > 0 ? formatCurrency(entry.owed) : ''}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#38a169' }}>
                        {entry.paid > 0 ? formatCurrency(entry.paid) : entry.paid < 0 ? `(${formatCurrency(Math.abs(entry.paid))})` : ''}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: runningBalance > 0 ? '#e53e3e' : '#1a202c' }}>
                        {formatCurrency(Math.abs(runningBalance))}
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
