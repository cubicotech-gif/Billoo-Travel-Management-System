import { useState } from 'react';
import { format } from 'date-fns';
import {
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  Edit,
  XCircle,
  AlertCircle
} from 'lucide-react';
import VoucherUploadModal from './VoucherUploadModal';
import { getOrCreateVendorTransaction, markPaymentSent } from '../../../lib/api/booking';

interface BookingStatusCardProps {
  service: any;
  queryId: string;
  queryStatus: string;
  onPaymentClick: (transaction: any) => void;
  onSkipPaymentClick: (serviceId: string) => void;
  onRefresh: () => void;
}

export default function BookingStatusCard({
  service,
  queryId,
  queryStatus,
  onPaymentClick,
  onSkipPaymentClick,
  onRefresh
}: BookingStatusCardProps) {
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show booking panel if query is in booking stage
  const showBookingPanel = [
    'Finalized & Booking',
    'Services Booked',
    'In Progress'
  ].includes(queryStatus);

  if (!showBookingPanel) {
    return null;
  }

  const handlePayVendor = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Get or create vendor transaction
      const transaction = await getOrCreateVendorTransaction(service.id);

      // Update service status to payment_sent
      await markPaymentSent(service.id);

      // Open payment modal with transaction
      onPaymentClick(transaction);
      onRefresh();
    } catch (err) {
      console.error('Error handling payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (service.booking_status) {
      case 'confirmed':
        return (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium text-sm">Confirmed</span>
          </div>
        );
      case 'payment_sent':
        return (
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-sm">Payment Sent</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1 rounded-full">
            <XCircle className="w-4 h-4" />
            <span className="font-medium text-sm">Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-sm">Pending</span>
          </div>
        );
    }
  };

  // Pending status
  if (service.booking_status === 'pending') {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Booking Status:</span>
          {getStatusBadge()}
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="text-sm text-gray-700">
            <div className="font-medium mb-1">Vendor Payment:</div>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Status: Not Paid</span>
            </div>
            <div className="flex items-center gap-2 text-gray-900 font-semibold mt-1">
              <DollarSign className="w-4 h-4" />
              <span>Amount Due: Rs {service.purchase_price.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePayVendor}
              disabled={isLoading || !service.vendor_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isLoading ? 'Loading...' : 'Pay Vendor'}</span>
            </button>
            <button
              onClick={() => onSkipPaymentClick(service.id)}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Skip Payment
            </button>
          </div>

          {!service.vendor_id && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please assign a vendor to this service first
            </p>
          )}
        </div>
      </div>
    );
  }

  // Payment sent status
  if (service.booking_status === 'payment_sent') {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Booking Status:</span>
          {getStatusBadge()}
        </div>

        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-2">
              {service.payment_skipped ? 'Payment Skipped' : 'Vendor Payment: Paid'}
            </div>
            {service.payment_skipped && (
              <div className="text-blue-700 text-xs mb-2">
                Reason: {service.skip_payment_reason}
              </div>
            )}
          </div>

          <div className="text-sm text-blue-900">
            <div className="font-medium mb-1">Next Step:</div>
            <div className="text-blue-700">Upload booking confirmation from vendor</div>
          </div>

          <button
            onClick={() => setIsVoucherModalOpen(true)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Upload Voucher & Confirm</span>
          </button>
        </div>

        <VoucherUploadModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          serviceId={service.id}
          serviceName={service.service_description}
          queryId={queryId}
          onSuccess={onRefresh}
        />
      </div>
    );
  }

  // Confirmed status
  if (service.booking_status === 'confirmed') {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Booking Status:</span>
          {getStatusBadge()}
        </div>

        <div className="bg-green-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-green-800 font-medium mb-1">Vendor Payment</div>
              <div className="text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Paid</span>
              </div>
            </div>
            <div>
              <div className="text-green-800 font-medium mb-1">Confirmation</div>
              <div className="text-green-700 font-mono text-xs">
                {service.booking_confirmation}
              </div>
            </div>
          </div>

          {service.voucher_url && (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <FileText className="w-4 h-4" />
              <span>Voucher: {service.voucher_url.split('/').pop()}</span>
            </div>
          )}

          {service.booked_date && (
            <div className="text-xs text-green-600">
              Booked on: {format(new Date(service.booked_date), 'MMM dd, yyyy')}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {service.voucher_url && (
              <a
                href={service.voucher_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Voucher</span>
              </a>
            )}
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        <VoucherUploadModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          serviceId={service.id}
          serviceName={service.service_description}
          queryId={queryId}
          onSuccess={onRefresh}
        />
      </div>
    );
  }

  // Cancelled status
  if (service.booking_status === 'cancelled') {
    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Booking Status:</span>
          {getStatusBadge()}
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-700">
            {service.booking_notes && (
              <div>
                <span className="font-medium">Reason: </span>
                {service.booking_notes}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
