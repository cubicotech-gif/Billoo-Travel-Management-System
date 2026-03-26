import { useEffect, useState } from 'react'
import { Search, Loader, User } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { getPassengersWithPendingInvoices } from '@/lib/api/finance'

interface SmartPassengerSelectorProps {
  onSelect: (passengerId: string, passengerName: string) => void
  onCancel: () => void
}

interface PassengerEntry {
  id: string
  firstName: string
  lastName: string
  pendingAmount: number
  invoiceCount: number
}

export default function SmartPassengerSelector({ onSelect, onCancel }: SmartPassengerSelectorProps) {
  const [passengers, setPassengers] = useState<PassengerEntry[]>([])
  const [filtered, setFiltered] = useState<PassengerEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPassengersWithPendingInvoices()
      .then(data => {
        setPassengers(data)
        setFiltered(data)
      })
      .catch(err => console.error('Error loading passengers:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(passengers)
    } else {
      const q = search.toLowerCase()
      setFiltered(passengers.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      ))
    }
  }, [search, passengers])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Passenger</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search passengers..."
                className="input pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-green-600" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {search ? 'No matching passengers' : 'No passengers with pending invoices'}
              </p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id, `${p.firstName} ${p.lastName}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.invoiceCount} pending invoice{p.invoiceCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(p.pendingAmount)}</p>
                    <p className="text-xs text-gray-400">due</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-200">
            <button onClick={onCancel} className="btn btn-secondary w-full">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
