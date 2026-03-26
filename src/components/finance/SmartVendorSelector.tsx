import { useEffect, useState } from 'react'
import { Search, Loader, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { getVendorsWithPendingBalance } from '@/lib/api/finance'

interface SmartVendorSelectorProps {
  onSelect: (vendorId: string, vendorName: string) => void
  onCancel: () => void
}

interface VendorEntry {
  id: string
  name: string
  totalOwed: number
  totalPaid: number
  pendingBalance: number
}

export default function SmartVendorSelector({ onSelect, onCancel }: SmartVendorSelectorProps) {
  const [vendors, setVendors] = useState<VendorEntry[]>([])
  const [filtered, setFiltered] = useState<VendorEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVendorsWithPendingBalance()
      .then(data => {
        setVendors(data)
        setFiltered(data)
      })
      .catch(err => console.error('Error loading vendors:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(vendors)
    } else {
      const q = search.toLowerCase()
      setFiltered(vendors.filter(v => v.name.toLowerCase().includes(q)))
    }
  }, [search, vendors])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Vendor</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="input pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {search ? 'No matching vendors' : 'No vendors with pending balance'}
              </p>
            ) : (
              filtered.map(v => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v.id, v.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">
                      Paid: {formatCurrency(v.totalPaid)} / {formatCurrency(v.totalOwed)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(v.pendingBalance)}</p>
                    <p className="text-xs text-gray-400">pending</p>
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
