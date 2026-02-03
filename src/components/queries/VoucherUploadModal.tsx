import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { QueryService } from '../../types/query-workflow';

interface Props {
  service: QueryService;
  onClose: () => void;
  onSuccess: (voucherUrl: string, confirmationNumber: string) => void;
}

export default function VoucherUploadModal({ service, onClose, onSuccess }: Props) {
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [voucherUrl, setVoucherUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmationNumber.trim()) {
      alert('Please enter booking confirmation number');
      return;
    }

    setUploading(true);

    try {
      await onSuccess(voucherUrl, confirmationNumber);
    } catch (error) {
      console.error('Error uploading voucher:', error);
      alert('Failed to upload voucher');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload Booking Confirmation
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Service:</strong> {service.service_description}
          </p>
          {service.vendors && (
            <p className="text-sm text-blue-700 mt-1">
              <strong>Vendor:</strong> {service.vendors.name}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Confirmation Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Confirmation Number *
            </label>
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., BKG-12345, REF-ABC123"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the booking reference provided by the vendor
            </p>
          </div>

          {/* Voucher URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher/Document URL (Optional)
            </label>
            <input
              type="url"
              value={voucherUrl}
              onChange={(e) => setVoucherUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/voucher.pdf"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to uploaded booking voucher or confirmation document
            </p>
          </div>

          {/* File Upload Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>📎 Note:</strong> Full file upload functionality will be available after Phase B integration. For now, you can upload files to your cloud storage and paste the link here.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
