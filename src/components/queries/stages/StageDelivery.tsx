import { useState } from 'react';
import { Truck, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import { supabase } from '../../../lib/supabase';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onComplete: () => void;
}

export default function StageDelivery({ query: _query, services, onRefresh, onComplete }: Props) {
  const deliveredCount = services.filter((s) => s.delivery_status === 'delivered').length;
  const deliveryProgress = services.length > 0 ? (deliveredCount / services.length) * 100 : 0;
  const allDelivered = deliveredCount === services.length && services.length > 0;

  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-cyan-600 text-white p-3 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-cyan-900 mb-2">
              🚚 Services Being Delivered
            </h3>
            <p className="text-sm text-cyan-700">
              Customer is currently experiencing the travel services. Track delivery status and ensure
              everything goes smoothly.
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Delivery Progress</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              Services Delivered: {deliveredCount} / {services.length}
            </span>
            <span className="font-semibold text-cyan-600">{Math.round(deliveryProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${deliveryProgress}%` }}
            />
          </div>
        </div>

        {allDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                All services delivered! Ready to mark query as completed.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Service Delivery Tracking */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Service Delivery Tracker</h3>

        {services.map((service, index) => (
          <ServiceDeliveryCard
            key={service.id}
            service={service}
            index={index}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      {/* Complete Query */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark Query as Completed</h3>
        <p className="text-gray-600 mb-6">
          {allDelivered
            ? 'All services have been successfully delivered. You can now mark this query as completed.'
            : 'Mark all services as delivered before completing the query.'}
        </p>

        <button
          onClick={onComplete}
          disabled={!allDelivered}
          className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            allDelivered
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          {allDelivered ? 'Mark Query as Completed' : 'Complete All Services First'}
        </button>
      </div>

      {/* Phase B Note */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <p className="text-sm text-cyan-800">
          <strong>Phase B Integration:</strong> Real-time delivery tracking, customer feedback
          collection, and automated notifications will be available after Phase B integration.
        </p>
      </div>
    </div>
  );
}

// Service Delivery Card Component
function ServiceDeliveryCard({
  service,
  index,
  onRefresh,
}: {
  service: QueryService;
  index: number;
  onRefresh: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('query_services')
      .update({ delivery_status: newStatus })
      .eq('id', service.id);

    if (!error) {
      onRefresh();
    } else {
      alert('Error updating delivery status: ' + error.message);
    }
    setIsUpdating(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-50 border-green-300';
      case 'in_progress':
        return 'bg-blue-50 border-blue-300';
      case 'issue':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'issue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Issue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 p-5 transition-all ${getStatusColor(service.delivery_status)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              {service.service_type}
            </span>
            {getStatusBadge(service.delivery_status)}
          </div>
          <h4 className="font-semibold text-gray-900 text-lg mb-1">{service.service_description}</h4>
          {service.vendors && (
            <p className="text-sm text-gray-600">Vendor: {service.vendors.name}</p>
          )}
          {service.service_date && (
            <p className="text-sm text-gray-600">
              Service Date: {new Date(service.service_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Delivery Status Actions */}
      {service.delivery_status !== 'delivered' && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleUpdateStatus('in_progress')}
            disabled={isUpdating}
            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Mark In Progress
          </button>
          <button
            onClick={() => handleUpdateStatus('delivered')}
            disabled={isUpdating}
            className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Mark Delivered
          </button>
          <button
            onClick={() => handleUpdateStatus('issue')}
            disabled={isUpdating}
            className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Report Issue
          </button>
        </div>
      )}

      {/* Customer Feedback */}
      {service.delivery_status === 'delivered' && (
        <div className="pt-4 border-t border-green-200">
          <button
            onClick={() => alert('Phase B: Customer feedback interface will open here')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Collect Customer Feedback
          </button>
        </div>
      )}
    </div>
  );
}
