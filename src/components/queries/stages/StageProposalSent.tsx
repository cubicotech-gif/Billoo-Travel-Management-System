import { useState } from 'react';
import { Send, MessageSquare, Edit, CheckCircle, XCircle } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import { format } from 'date-fns';

interface Props {
  query: Query;
  services: QueryService[];
  onLogResponse: (response: { type: 'accepted' | 'revisions' | 'rejected'; feedback: string }) => void;
  onRevise: () => void;
}

export default function StageProposalSent({ query, services, onLogResponse, onRevise }: Props) {
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'revisions' | 'rejected'>('accepted');
  const [feedback, setFeedback] = useState('');

  const handleSubmitResponse = () => {
    onLogResponse({ type: responseType, feedback });
    setShowResponseModal(false);
    setFeedback('');
  };

  const totalSelling = services.reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0);

  return (
    <div className="space-y-6">
      {/* Stage Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-green-600 text-white p-3 rounded-lg">
            <Send className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              📧 Proposal Sent to Customer
            </h3>
            <p className="text-sm text-green-700 mb-2">
              Package proposal has been sent to the customer. Waiting for their response.
            </p>
            {query.proposal_sent_date && (
              <p className="text-xs text-green-600">
                Sent on: {format(new Date(query.proposal_sent_date), 'MMM dd, yyyy \'at\' hh:mm a')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Proposal Details</h3>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Services Included</div>
              <div className="text-lg font-semibold text-gray-900">{services.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Package Price</div>
              <div className="text-lg font-semibold text-gray-900">
                Rs {totalSelling.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Destination</div>
              <div className="text-lg font-semibold text-gray-900">{query.destination}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Customer</div>
              <div className="text-lg font-semibold text-gray-900">{query.client_name}</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Services in Proposal:</div>
            <div className="space-y-2">
              {services.map((service, index) => (
                <div key={service.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {index + 1}. {service.service_description}
                  </span>
                  <span className="font-medium text-gray-900">
                    Rs {((service.selling_price || 0) * (service.quantity || 1)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Response Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          <MessageSquare className="w-5 h-5 inline mr-2" />
          Customer Response
        </h3>
        <p className="text-gray-600 mb-6">
          Has the customer responded to this proposal? Log their response to proceed to the next stage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setResponseType('accepted');
              setShowResponseModal(true);
            }}
            className="flex items-center justify-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg hover:bg-green-100 transition-colors group"
          >
            <CheckCircle className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-green-900">Customer Accepted</div>
              <div className="text-xs text-green-700">Proceed to booking</div>
            </div>
          </button>

          <button
            onClick={() => {
              setResponseType('revisions');
              setShowResponseModal(true);
            }}
            className="flex items-center justify-center gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg hover:bg-amber-100 transition-colors group"
          >
            <Edit className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-amber-900">Requested Changes</div>
              <div className="text-xs text-amber-700">Customer wants revisions</div>
            </div>
          </button>

          <button
            onClick={() => {
              setResponseType('rejected');
              setShowResponseModal(true);
            }}
            className="flex items-center justify-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-colors group"
          >
            <XCircle className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-red-900">Customer Declined</div>
              <div className="text-xs text-red-700">Mark as cancelled</div>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onRevise}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Go back to edit proposal
          </button>
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Log Customer Response
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Type
              </label>
              <div className="text-sm font-medium px-3 py-2 rounded-lg bg-gray-100">
                {responseType === 'accepted' && '✅ Customer Accepted'}
                {responseType === 'revisions' && '✏️ Customer Requested Changes'}
                {responseType === 'rejected' && '❌ Customer Declined'}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Feedback / Notes
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter any feedback or comments from the customer..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setFeedback('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
