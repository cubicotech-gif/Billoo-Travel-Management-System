import { XCircle, AlertTriangle, FileText } from 'lucide-react';
import { Query } from '../../../types/query-workflow';
import { format } from 'date-fns';

interface Props {
  query: Query;
}

export default function StageCancelled({ query }: Props) {
  return (
    <div className="space-y-6">
      {/* Cancellation Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-red-900 mb-2">❌ Query Cancelled</h2>
        <p className="text-red-700 mb-3">
          This query was cancelled or marked as lost. No further action is required.
        </p>
        {query.updated_at && (
          <p className="text-sm text-red-600">
            Status updated: {format(new Date(query.updated_at), 'MMMM dd, yyyy \'at\' hh:mm a')}
          </p>
        )}
      </div>

      {/* Cancellation Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Query Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Basic Information</div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Query Number:</span>
                <span className="font-medium text-gray-900">#{query.query_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{query.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Destination:</span>
                <span className="font-medium text-gray-900">{query.destination}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contact:</span>
                <span className="font-medium text-gray-900">{query.customer_phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Timeline</div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(query.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(query.updated_at), 'MMM dd, yyyy')}
                </span>
              </div>
              {query.proposal_sent_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Proposal Sent:</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(query.proposal_sent_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-red-700">Cancelled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Feedback / Cancellation Reason */}
        {query.customer_feedback && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Cancellation Reason / Feedback
            </h4>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{query.customer_feedback}</p>
            </div>
          </div>
        )}
      </div>

      {/* What Happened */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What Happened?</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            This query was marked as cancelled. This could happen for several reasons:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Customer declined the proposal</li>
            <li>Customer chose a competitor</li>
            <li>Customer changed their travel plans</li>
            <li>Budget constraints</li>
            <li>Timing issues</li>
            <li>Other reasons</li>
          </ul>
        </div>
      </div>

      {/* Learnings & Next Steps */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Learnings for Future</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Review & Learn:</strong> Analyze what could be improved for similar queries in
            the future.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Was the pricing competitive?</li>
            <li>Did we respond quickly enough?</li>
            <li>Was the proposal compelling?</li>
            <li>Could we have offered better alternatives?</li>
          </ul>
        </div>
      </div>

      {/* Follow-up Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => alert('Phase B: Customer follow-up system will open here')}
            className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            📞 Schedule Follow-up Call
          </button>
          <button
            onClick={() => alert('Phase B: Add to nurture campaign for future opportunities')}
            className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
          >
            📧 Add to Nurture Campaign
          </button>
        </div>
      </div>

      {/* Archive Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          📁 This query is archived. No further action is needed unless the customer reaches out
          again.
        </p>
      </div>
    </div>
  );
}
