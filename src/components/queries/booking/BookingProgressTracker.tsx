import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface ServiceBookingStatus {
  id: string;
  service_description: string;
  booking_status: 'pending' | 'payment_sent' | 'confirmed' | 'cancelled';
}

interface BookingProgressTrackerProps {
  services: ServiceBookingStatus[];
  className?: string;
}

export default function BookingProgressTracker({ services, className = '' }: BookingProgressTrackerProps) {
  const totalServices = services.length;
  const confirmedServices = services.filter(s => s.booking_status === 'confirmed').length;
  const paymentSentServices = services.filter(s => s.booking_status === 'payment_sent').length;
  const pendingServices = services.filter(s => s.booking_status === 'pending').length;
  const cancelledServices = services.filter(s => s.booking_status === 'cancelled').length;

  const progressPercentage = totalServices > 0 ? (confirmedServices / totalServices) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'payment_sent':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'payment_sent':
        return 'Payment Sent';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-700';
      case 'payment_sent':
        return 'text-blue-700';
      case 'cancelled':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Progress</h3>

      <div className="space-y-4">
        {/* Progress Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Services: <span className="font-semibold text-gray-900">{confirmedServices} of {totalServices}</span> confirmed
          </span>
          <span className="font-semibold text-gray-900">{Math.round(progressPercentage)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {confirmedServices > 0 && (
            <div className="flex items-center gap-1 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>{confirmedServices} Confirmed</span>
            </div>
          )}
          {paymentSentServices > 0 && (
            <div className="flex items-center gap-1 text-blue-700">
              <Clock className="w-4 h-4" />
              <span>{paymentSentServices} Payment Sent</span>
            </div>
          )}
          {pendingServices > 0 && (
            <div className="flex items-center gap-1 text-gray-700">
              <Clock className="w-4 h-4" />
              <span>{pendingServices} Pending</span>
            </div>
          )}
          {cancelledServices > 0 && (
            <div className="flex items-center gap-1 text-red-700">
              <XCircle className="w-4 h-4" />
              <span>{cancelledServices} Cancelled</span>
            </div>
          )}
        </div>

        {/* Service List */}
        <div className="mt-4 space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(service.booking_status)}
                <span className="text-sm text-gray-900">{service.service_description}</span>
              </div>
              <span className={`text-xs font-medium ${getStatusColor(service.booking_status)}`}>
                {getStatusLabel(service.booking_status)}
              </span>
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {confirmedServices === totalServices && totalServices > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">All services booked!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All bookings are confirmed. Ready to notify customer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
