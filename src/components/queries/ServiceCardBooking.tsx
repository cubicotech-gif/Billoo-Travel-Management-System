import { useState, useEffect } from 'react';
import { CreditCard, Upload, ExternalLink, Building2 } from 'lucide-react';
import { QueryService } from '../../types/query-workflow';
import { supabase } from '../../lib/supabase';
import BookingStatusBadge from './BookingStatusBadge';
import VoucherUploadModal from './VoucherUploadModal';
import RecordPaymentModal from './RecordPaymentModal';

interface Props {
  service: QueryService;
  index: number;
  onRefresh: () => void;
}

interface Vendor {
  id: string;
  name: string;
  type: string;
  default_currency: string;
}

interface VendorTransaction {
  id: string;
  vendor_id: string;
  purchase_amount_pkr: number;
  purchase_amount_original: number;
  amount_paid: number;
  payment_status: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  receipt_url?: string;
  currency: string;
}

export default function ServiceCardBooking({ service, index, onRefresh }: Props) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [transaction, setTransaction] = useState<VendorTransaction | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [service.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load vendor
      if (service.vendor_id) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', service.vendor_id)
          .single();
        setVendor(vendorData);
      }

      // Load transaction
      const { data: txData } = await supabase
        .from('vendor_transactions')
        .select('*')
        .eq('service_id', service.id)
        .single();
      setTransaction(txData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRecorded = async () => {
    // Refresh data
    await loadData();
    onRefresh();
  };

  const handleVoucherUploaded = async (voucherUrl: string, confirmationNumber: string) => {
    try {
      // Update service with voucher and mark as confirmed
      const { error } = await supabase
        .from('query_services')
        .update({
          booking_status: 'confirmed',
          booked_date: new Date().toISOString(),
          booking_confirmation: confirmationNumber,
          voucher_url: voucherUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id);

      if (error) throw error;

      await loadData();
      onRefresh();
    } catch (error: any) {
      console.error('Error updating service:', error);
      throw error;
    }
  };

  const isBooked = service.booking_status === 'confirmed';
  const isPaid = transaction?.payment_status === 'PAID' || transaction?.payment_status === 'PARTIAL';

  if (loading) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-5 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border-2 p-5 transition-all ${
        isBooked
          ? 'border-green-300 bg-green-50'
          : isPaid
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {service.service_type}
            </span>
            <BookingStatusBadge status={service.booking_status} />
          </div>
          <h4 className="font-semibold text-gray-900 text-lg mb-1">{service.service_description}</h4>

          {/* Vendor Info */}
          {vendor && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>{vendor.name}</span>
              <button
                onClick={() => window.open(`/vendors/${vendor.id}`, '_blank')}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {service.service_date && (
            <p className="text-sm text-gray-600 mt-1">
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

      {/* BOOKING WORKFLOW STEPS */}
      <div className="space-y-4 mt-6">
        {/* STEP 1: Pay Vendor */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            isPaid
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isPaid ? 'bg-green-600' : 'bg-gray-400'
              }`}>
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <h5 className="font-semibold text-gray-900">Pay Vendor</h5>
            </div>
            {isPaid ? (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                ✅ Paid
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                ⏳ Pending
              </span>
            )}
          </div>

          {transaction && (
            <div className="text-sm">
              <p className="text-gray-600 mb-2">
                Amount: {transaction.purchase_amount_original} {transaction.currency}
                {transaction.currency !== 'PKR' && ` (Rs ${transaction.purchase_amount_pkr?.toLocaleString()})`}
              </p>

              {isPaid ? (
                <div className="space-y-1">
                  <p className="text-green-700">
                    ✅ Paid: Rs {transaction.amount_paid?.toLocaleString()}
                  </p>
                  {transaction.payment_date && (
                    <p className="text-gray-600">
                      Date: {new Date(transaction.payment_date).toLocaleDateString()}
                    </p>
                  )}
                  {transaction.payment_method && (
                    <p className="text-gray-600">Method: {transaction.payment_method}</p>
                  )}
                  {transaction.payment_reference && (
                    <p className="text-gray-600">Ref: {transaction.payment_reference}</p>
                  )}
                  {transaction.receipt_url && (
                    <a
                      href={transaction.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      View Receipt <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Vendor Now
                </button>
              )}
            </div>
          )}

          {!transaction && (
            <p className="text-sm text-amber-700">
              ⚠️ No transaction record found. Vendor assignment may be missing.
            </p>
          )}
        </div>

        {/* STEP 2: Upload Booking Voucher */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            isBooked
              ? 'bg-green-50 border-green-300'
              : isPaid
              ? 'bg-gray-50 border-gray-300'
              : 'bg-gray-50 border-gray-300 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isBooked ? 'bg-green-600' : isPaid ? 'bg-gray-400' : 'bg-gray-300'
              }`}>
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <h5 className="font-semibold text-gray-900">Upload Booking Confirmation</h5>
            </div>
            {isBooked ? (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                ✅ Confirmed
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                ⏳ Awaiting
              </span>
            )}
          </div>

          <div className="text-sm">
            {isBooked ? (
              <div className="space-y-1">
                <p className="text-green-700">
                  ✅ Booking Confirmed: {service.booking_confirmation}
                </p>
                {service.booked_date && (
                  <p className="text-gray-600">
                    Booked: {new Date(service.booked_date).toLocaleDateString()}
                  </p>
                )}
                {service.voucher_url && (
                  <a
                    href={service.voucher_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    📄 View Voucher <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : isPaid ? (
              <div>
                <p className="text-gray-600 mb-2">
                  Upload booking confirmation from vendor
                </p>
                <button
                  onClick={() => setShowVoucherModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Upload Voucher
                </button>
              </div>
            ) : (
              <p className="text-gray-500">Pay vendor first to unlock this step</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && transaction && (
        <RecordPaymentModal
          transaction={transaction}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            handlePaymentRecorded();
          }}
        />
      )}

      {showVoucherModal && (
        <VoucherUploadModal
          service={service}
          onClose={() => setShowVoucherModal(false)}
          onSuccess={handleVoucherUploaded}
        />
      )}
    </div>
  );
}
