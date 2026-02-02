import { useState, useEffect } from 'react';
import { CheckCircle, CreditCard, Upload, AlertCircle } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import { supabase } from '../../../lib/supabase';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onAllBooked: () => void;
}

export default function StageBooking({ query, services, onRefresh, onAllBooked }: Props) {
  const [bookingProgress, setBookingProgress] = useState({ confirmed: 0, total: services.length });

  useEffect(() => {
    checkBookingProgress();
  }, [services]);

  const checkBookingProgress = () => {
    const confirmed = services.filter((s) => s.booking_status === 'confirmed').length;
    setBookingProgress({ confirmed, total: services.length });

    // Auto-advance if all confirmed
    if (confirmed === services.length && services.length > 0) {
      setTimeout(() => onAllBooked(), 1000);
    }
  };

  const handleMarkAsBooked = async (serviceId: string) => {
    const { error } = await supabase
      .from('query_services')
      .update({
        booking_status: 'confirmed',
        booked_date: new Date().toISOString(),
      })
      .eq('id', serviceId);

    if (!error) {
      onRefresh();
    } else {
      alert('Error updating booking status: ' + error.message);
    }
  };

  const progressPercentage =
    bookingProgress.total > 0 ? (bookingProgress.confirmed / bookingProgress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-teal-600 text-white p-3 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-teal-900 mb-2">
              ✅ Package Finalized - Ready to Book
            </h3>
            <p className="text-sm text-teal-700">
              Customer approved the proposal! Now book each service with vendors and upload booking
              confirmations.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Booking Progress</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              Services Confirmed: {bookingProgress.confirmed} / {bookingProgress.total}
            </span>
            <span className="font-semibold text-teal-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-cyan-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 10 && (
                <span className="text-xs font-bold text-white">
                  {Math.round(progressPercentage)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {bookingProgress.confirmed === bookingProgress.total && bookingProgress.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">All services booked! Advancing to next stage...</span>
            </div>
          </div>
        )}
      </div>

      {/* Services - Booking Mode */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Services to Book</h3>

        {services.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No services to book. Add services first.</p>
          </div>
        ) : (
          services.map((service, index) => (
            <ServiceBookingCard
              key={service.id}
              service={service}
              index={index}
              onMarkBooked={() => handleMarkAsBooked(service.id)}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>

      {/* Phase B Integration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Coming Soon:</strong> Full vendor payment interface with payment tracking, voucher
          upload, and booking confirmation management will be available after Phase B integration.
        </p>
      </div>
    </div>
  );
}

// Service Booking Card Component
function ServiceBookingCard({
  service,
  index,
  onMarkBooked,
  onRefresh,
}: {
  service: QueryService;
  index: number;
  onMarkBooked: () => void;
  onRefresh: () => void;
}) {
  const isBooked = service.booking_status === 'confirmed';
  const isPending = service.booking_status === 'pending';

  return (
    <div
      className={`bg-white rounded-lg border-2 p-5 transition-all ${
        isBooked
          ? 'border-green-300 bg-green-50'
          : isPending
          ? 'border-gray-200 hover:border-blue-300'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {service.service_type}
            </span>
            {isBooked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Booked
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 text-lg mb-1">{service.service_description}</h4>
          {service.vendors && (
            <p className="text-sm text-gray-600 mb-1">
              <strong>Vendor:</strong> {service.vendors.name}
            </p>
          )}
          {service.service_date && (
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date(service.service_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Payment to Vendor</div>
          <div className="text-2xl font-bold text-gray-900">
            Rs {((service.cost_price || 0) * (service.quantity || 1)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Booking Actions */}
      {!isBooked && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => alert('Phase B: Payment interface will open here')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Pay Vendor
          </button>
          <button
            onClick={() => alert('Phase B: Upload voucher interface will open here')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Voucher
          </button>
          <button
            onClick={onMarkBooked}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Booked
          </button>
        </div>
      )}

      {/* Booked Status */}
      {isBooked && (
        <div className="pt-4 border-t border-green-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-700 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Booking Confirmed
            </span>
            {service.booked_date && (
              <span className="text-green-600">
                Booked on: {new Date(service.booked_date).toLocaleDateString()}
              </span>
            )}
          </div>
          {service.booking_confirmation && (
            <p className="text-xs text-green-600 mt-2">
              Confirmation: {service.booking_confirmation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
