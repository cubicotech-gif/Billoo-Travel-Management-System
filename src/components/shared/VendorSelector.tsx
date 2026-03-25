import { useState, useEffect, useRef } from 'react'
import { Building2, Search, X } from 'lucide-react'
import { fetchActiveVendors } from '@/lib/api/vendors'
import type { VendorOption } from '@/types/finance'

interface VendorSelectorProps {
  value: string
  onChange: (vendorId: string) => void
  placeholder?: string
  filterServiceType?: string
  disabled?: boolean
}

export default function VendorSelector({
  value,
  onChange,
  placeholder = 'Select vendor...',
  filterServiceType,
  disabled = false,
}: VendorSelectorProps) {
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadVendors()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const data = await fetchActiveVendors()
      setVendors(data)
    } catch (err) {
      console.error('Error loading vendors:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterServiceType && v.service_types && !v.service_types.includes(filterServiceType)) return false
    return true
  })

  const selectedVendor = vendors.find(v => v.id === value)

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input flex items-center cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <Building2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
        {selectedVendor ? (
          <div className="flex items-center justify-between flex-1">
            <span className="text-gray-900">{selectedVendor.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-400 flex-1">{placeholder}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center border border-gray-300 rounded px-2 py-1">
              <Search className="w-4 h-4 text-gray-400 mr-1" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="flex-1 text-sm outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-3">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-3">No vendors found</p>
            ) : (
              filtered.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { onChange(v.id); setIsOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    v.id === value ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{v.name}</span>
                    {v.service_types && v.service_types.length > 0 && (
                      <span className="text-xs text-gray-500">{v.service_types.join(', ')}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
