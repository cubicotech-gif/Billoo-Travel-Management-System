import { useState } from 'react';
import { X, Upload, FileText, Loader } from 'lucide-react';
import { confirmBooking } from '../../../lib/api/booking';

interface VoucherUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  queryId: string;
  onSuccess: () => void;
}

export default function VoucherUploadModal({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  queryId,
  onSuccess
}: VoucherUploadModalProps) {
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setVoucherFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setVoucherFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmationNumber.trim()) {
      setError('Please enter a confirmation number');
      return;
    }

    setIsUploading(true);

    try {
      // Upload voucher and confirm booking
      await confirmBooking(serviceId, queryId, {
        confirmationNumber: confirmationNumber.trim(),
        voucherFile,
        notes: notes.trim()
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error confirming booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setConfirmationNumber('');
    setVoucherFile(null);
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Booking Voucher</h2>
            <p className="text-sm text-gray-600 mt-1">{serviceName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Confirmation Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Confirmation Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              placeholder="PNR, Confirmation Code, Reference Number, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isUploading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the booking reference provided by the vendor
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Voucher/Confirmation
            </label>

            {!voucherFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  PDF, JPG, PNG (max 5MB)
                </p>
                <input
                  type="file"
                  id="voucher-file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <label
                  htmlFor="voucher-file"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Choose File
                </label>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{voucherFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(voucherFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Booking Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional booking details, special requests, etc."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isUploading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !confirmationNumber.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <span>Save & Mark as Confirmed</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
