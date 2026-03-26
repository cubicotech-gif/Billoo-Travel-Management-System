import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { addInvoiceItem, updateInvoiceItem, deleteInvoiceItem } from '@/lib/api/finance'
import { supabase } from '@/lib/supabase'
import type { InvoiceItem } from '@/types/finance'
import { SERVICE_TYPES } from '@/types/finance'

interface InlineLineItemEditorProps {
  invoiceId: string
  items: InvoiceItem[]
  onItemsChanged: () => void
}

interface VendorOption {
  id: string
  name: string
}

interface EditingItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  tax_percentage: number
  service_type: string
  vendor_id: string
  purchase_price: number
  selling_price: number
  notes: string
}

const emptyItem: EditingItem = {
  description: '', quantity: 1, unit_price: 0, tax_percentage: 0,
  service_type: '', vendor_id: '', purchase_price: 0, selling_price: 0, notes: '',
}

export default function InlineLineItemEditor({ invoiceId, items, onItemsChanged }: InlineLineItemEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingItem>(emptyItem)
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [vendors, setVendors] = useState<VendorOption[]>([])

  useEffect(() => {
    supabase.from('vendors').select('id, name').eq('is_active', true).eq('is_deleted', false).order('name')
      .then(({ data }) => setVendors(data || []))
  }, [])

  const startEdit = (item: InvoiceItem) => {
    setEditingId(item.id)
    setAddingNew(false)
    setEditData({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_percentage: item.tax_percentage,
      service_type: item.service_type || '',
      vendor_id: item.vendor_id || '',
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      notes: item.notes || '',
    })
  }

  const startAdd = () => {
    setEditingId(null)
    setAddingNew(true)
    setEditData({ ...emptyItem })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAddingNew(false)
  }

  const handleSave = async () => {
    if (!editData.description.trim()) return
    setSaving(true)
    try {
      if (addingNew) {
        await addInvoiceItem(invoiceId, {
          description: editData.description,
          quantity: editData.quantity,
          unit_price: editData.selling_price,
          tax_percentage: editData.tax_percentage,
          service_type: editData.service_type || null,
          vendor_id: editData.vendor_id || null,
          purchase_price: editData.purchase_price,
          selling_price: editData.selling_price,
          notes: editData.notes || null,
        })
      } else if (editingId) {
        await updateInvoiceItem(editingId, invoiceId, {
          description: editData.description,
          quantity: editData.quantity,
          unit_price: editData.selling_price,
          tax_percentage: editData.tax_percentage,
          service_type: editData.service_type || null,
          vendor_id: editData.vendor_id || null,
          purchase_price: editData.purchase_price,
          selling_price: editData.selling_price,
          notes: editData.notes || null,
        })
      }
      cancelEdit()
      onItemsChanged()
    } catch (err) {
      console.error('Error saving item:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this line item?')) return
    setDeletingId(itemId)
    try {
      await deleteInvoiceItem(itemId, invoiceId)
      onItemsChanged()
    } catch (err) {
      console.error('Error deleting item:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const updateField = (field: keyof EditingItem, value: any) => {
    const next = { ...editData, [field]: value }
    // Auto-calc unit_price from selling_price
    if (field === 'selling_price') {
      next.unit_price = Number(value)
    }
    setEditData(next)
  }

  const profit = editData.selling_price - editData.purchase_price

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Line Items ({items.length})
        </h3>
        {!addingNew && !editingId && (
          <button onClick={startAdd} className="btn btn-secondary btn-sm">
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Selling</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map(item => {
              const isEditing = editingId === item.id
              if (isEditing) {
                return (
                  <tr key={item.id} className="bg-blue-50">
                    <td className="px-3 py-2">
                      <input type="text" value={editData.description}
                        onChange={e => updateField('description', e.target.value)}
                        className="input text-sm" placeholder="Description" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={editData.service_type} onChange={e => updateField('service_type', e.target.value)} className="input text-sm">
                        <option value="">—</option>
                        {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={editData.vendor_id} onChange={e => updateField('vendor_id', e.target.value)} className="input text-sm">
                        <option value="">—</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="1" value={editData.quantity}
                        onChange={e => updateField('quantity', parseInt(e.target.value) || 1)}
                        className="input text-sm text-right w-16" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editData.selling_price}
                        onChange={e => updateField('selling_price', parseFloat(e.target.value) || 0)}
                        className="input text-sm text-right w-24" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editData.purchase_price}
                        onChange={e => updateField('purchase_price', parseFloat(e.target.value) || 0)}
                        className="input text-sm text-right w-24" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(profit)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={handleSave} disabled={saving}
                          className="p-1 text-green-600 hover:bg-green-100 rounded">
                          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={item.id} className="hover:bg-gray-50 group">
                  <td className="px-3 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{item.service_type || '—'}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{item.vendors?.name || '—'}</td>
                  <td className="px-3 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-3 py-3 text-sm text-right">{formatCurrency(item.selling_price)}</td>
                  <td className="px-3 py-3 text-sm text-right text-gray-600">{formatCurrency(item.purchase_price)}</td>
                  <td className="px-3 py-3 text-sm text-right">
                    <span className={item.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(item.profit)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(item)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                        className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                        {deletingId === item.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Add new row */}
            {addingNew && (
              <tr className="bg-green-50">
                <td className="px-3 py-2">
                  <input type="text" value={editData.description}
                    onChange={e => updateField('description', e.target.value)}
                    className="input text-sm" placeholder="Description" autoFocus />
                </td>
                <td className="px-3 py-2">
                  <select value={editData.service_type} onChange={e => updateField('service_type', e.target.value)} className="input text-sm">
                    <option value="">—</option>
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={editData.vendor_id} onChange={e => updateField('vendor_id', e.target.value)} className="input text-sm">
                    <option value="">—</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="1" value={editData.quantity}
                    onChange={e => updateField('quantity', parseInt(e.target.value) || 1)}
                    className="input text-sm text-right w-16" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={editData.selling_price}
                    onChange={e => updateField('selling_price', parseFloat(e.target.value) || 0)}
                    className="input text-sm text-right w-24" placeholder="0" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={editData.purchase_price}
                    onChange={e => updateField('purchase_price', parseFloat(e.target.value) || 0)}
                    className="input text-sm text-right w-24" placeholder="0" />
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={handleSave} disabled={saving}
                      className="p-1 text-green-600 hover:bg-green-100 rounded">
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-gray-900 text-right">Totals</td>
              <td className="px-3 py-3 text-sm font-bold text-right">
                {formatCurrency(items.reduce((s, i) => s + i.selling_price, 0))}
              </td>
              <td className="px-3 py-3 text-sm font-bold text-right text-gray-600">
                {formatCurrency(items.reduce((s, i) => s + i.purchase_price, 0))}
              </td>
              <td className="px-3 py-3 text-sm font-bold text-right">
                <span className={items.reduce((s, i) => s + i.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(items.reduce((s, i) => s + i.profit, 0))}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
