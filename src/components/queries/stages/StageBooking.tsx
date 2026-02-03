import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import ServiceCardBooking from '../ServiceCardBooking';
import QueryVendorPaymentSummary from '../QueryVendorPaymentSummary';

interface Props {
  query: Query;
  services: QueryService[];
  onRefresh: () => void;
  onAllBooked: () => void;
}

export default function StageBooking({ query, services, onRefresh, onAllBooked }: Props) {
  const [bookingProgress, setBookingProgress] = useState({ confirmed: 0, total: services.length });

  const checkBookingProgress = useCallback(() => {
    const confirmed = services.filter((s) => s.booking_status === 'confirmed').length;
    setBookingProgress({ confirmed, total: services.length });

    // Auto-advance if all confirmed
    if (confirmed === services.length && services.length > 0) {
      setTimeout(() => onAllBooked(), 1000);
    }
  }, [services, onAllBooked]);

  useEffect(() => {
    checkBookingProgress();
  }, [checkBookingProgress]);


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

      {/* Vendor Payment Summary */}
      <QueryVendorPaymentSummary queryId={query.id} />

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
            <ServiceCardBooking
              key={service.id}
              service={service}
              index={index}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
