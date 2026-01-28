import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Edit3 } from 'lucide-react';
import type { CustomerResponseType } from '../../types/proposals';
import { updateProposalResponse } from '../../lib/api/proposals';
import { format } from 'date-fns';

interface CustomerResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalVersion: number;
  onSuccess: () => void;
}

const RESPONSE_OPTIONS = [
  {
    id: 'accepted' as CustomerResponseType,
    label: 'Accepted - Ready to proceed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Customer has accepted the proposal and is ready to book'
  },
  {
    id: 'wants_changes' as CustomerResponseType,
    label: 'Wants Changes - Needs revision',
    icon: Edit3,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Customer wants modifications to the proposal'
  },
  {
    id: 'rejected' as CustomerResponseType,
    label: 'Rejected - Not interested',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Customer has declined the proposal'
  },
  {
    id: 'needs_time' as CustomerResponseType,
    label: 'Needs more time',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Customer needs more time to decide'
  }
];

export default function CustomerResponseModal({
  isOpen,
  onClose,
  proposalId,
  proposalVersion,
  onSuccess
}: CustomerResponseModalProps) {
  const [selectedResponse, setSelectedResponse] = useState<CustomerResponseType | null>(null);
  const [feedback, setFeedback] = useState('');
  const [responseDate, setResponseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveResponse = async () => {
    if (!selectedResponse) {
      setError('Please select a response type');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProposalResponse({
        proposalId,
        responseType: selectedResponse,
        feedback: feedback.trim(),
        responseDate
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving customer response:', err);
      setError('Failed to save response. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOption = RESPONSE_OPTIONS.find(opt => opt.id === selectedResponse);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Log Customer Response</h2>
            <p className="text-sm text-gray-500 mt-1">
              Proposal v{proposalVersion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Response Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Customer Response: *
            </label>
            <div className="space-y-3">
              {RESPONSE_OPTIONS.map(option => {
                const Icon = option.icon;
                const isSelected = selectedResponse === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedResponse(option.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      isSelected
                        ? `${option.borderColor} ${option.bgColor}`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? option.color : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500 mt-1">{option.description}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          isSelected
                            ? `${option.borderColor} ${option.bgColor}`
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className={`w-full h-full rounded-full ${option.color.replace('text-', 'bg-')}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Feedback: {selectedResponse === 'wants_changes' && '*'}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={
                selectedResponse === 'wants_changes'
                  ? 'What changes does the customer want? (Required for revisions)'
                  : 'Any additional comments or feedback from the customer...'
              }
            />
            {selectedResponse === 'wants_changes' && (
              <p className="text-xs text-orange-600 mt-1">
                Please specify what changes the customer wants so the team can revise the proposal accordingly.
              </p>
            )}
          </div>

          {/* Response Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Date: *
            </label>
            <input
              type="date"
              value={responseDate}
              onChange={(e) => setResponseDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Next Steps Preview */}
          {selectedOption && (
            <div className={`${selectedOption.bgColor} border ${selectedOption.borderColor} p-4 rounded-lg`}>
              <h4 className={`font-medium ${selectedOption.color} mb-2`}>What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {selectedResponse === 'accepted' && (
                  <>
                    <li>• Query status will change to "Finalized & Booking"</li>
                    <li>• You can record advance payment if received</li>
                    <li>• Next step: Start booking with vendors</li>
                  </>
                )}
                {selectedResponse === 'wants_changes' && (
                  <>
                    <li>• Query status will change to "Revisions Requested"</li>
                    <li>• Team will be notified to revise the proposal</li>
                    <li>• Next step: Edit services and send revised proposal</li>
                  </>
                )}
                {selectedResponse === 'rejected' && (
                  <>
                    <li>• Query status will change to "Cancelled"</li>
                    <li>• Query will be archived but remain accessible</li>
                    <li>• No further action required</li>
                  </>
                )}
                {selectedResponse === 'needs_time' && (
                  <>
                    <li>• Query status remains "Proposal Sent"</li>
                    <li>• Proposal validity period continues</li>
                    <li>• Follow up with customer after a few days</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveResponse}
            disabled={
              isSaving ||
              !selectedResponse ||
              (selectedResponse === 'wants_changes' && !feedback.trim())
            }
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
