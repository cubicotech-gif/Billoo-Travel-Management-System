'use client';

import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import type { Query, QueryService } from '@/types/query';
import { queryServiceApi } from '@/lib/api/queries';
import ServiceCard from './ServiceCard';
import AddEditServiceModal from './AddEditServiceModal';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
}

export default function ServicesTab({ query, services, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<QueryService | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (service: QueryService) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setShowModal(true);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await queryServiceApi.delete(serviceId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Services ({services.length})
        </h2>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Service grid or empty state */}
      {services.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No services added yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Start building the package by adding flights, hotels, visas, and other services.
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div key={service.id} className="relative">
              <ServiceCard
                service={service}
                onEdit={() => handleEdit(service)}
                onDelete={() => setDeletingId(service.id)}
              />

              {/* Delete confirmation overlay */}
              {deletingId === service.id && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      Delete this service?
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AddEditServiceModal
          isOpen={showModal}
          queryId={query.id}
          editingService={editingService ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditingService(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingService(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
