import { Target, CheckSquare } from 'lucide-react';

interface BookingModeAlertProps {
  queryStatus: string;
  className?: string;
}

export default function BookingModeAlert({ queryStatus, className = '' }: BookingModeAlertProps) {
  // Only show for booking-related statuses
  const showAlert = [
    'Finalized & Booking',
    'Services Booked',
    'In Progress'
  ].includes(queryStatus);

  if (!showAlert) return null;

  const isCompleted = queryStatus === 'Services Booked';

  return (
    <div className={`rounded-lg border-2 ${isCompleted ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'} p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${isCompleted ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isCompleted ? (
            <CheckSquare className="w-6 h-6 text-green-600" />
          ) : (
            <Target className="w-6 h-6 text-blue-600" />
          )}
        </div>

        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-2 ${isCompleted ? 'text-green-900' : 'text-blue-900'}`}>
            {isCompleted ? '✅ ALL SERVICES BOOKED!' : '🎯 BOOKING MODE ACTIVE'}
          </h3>

          {isCompleted ? (
            <div>
              <p className="text-green-800 mb-3">
                All vendors have been paid and bookings are confirmed. Your package is ready!
              </p>
              <div className="space-y-1 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>All vendor payments completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>Booking confirmations received</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>Ready to notify customer</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-blue-800 mb-3">
                Package finalized. Ready to book services with vendors.
              </p>
              <div className="space-y-1 text-sm text-blue-700">
                <div className="font-semibold mb-1">Next Steps:</div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-900 text-xs font-bold">
                    1
                  </span>
                  <span>Pay vendors for each service</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-900 text-xs font-bold">
                    2
                  </span>
                  <span>Upload booking confirmations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-900 text-xs font-bold">
                    3
                  </span>
                  <span>Mark services as booked</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
