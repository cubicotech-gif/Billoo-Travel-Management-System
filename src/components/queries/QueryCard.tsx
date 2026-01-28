import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  MapPin, Users, Calendar, Phone, Mail, Clock,
  AlertCircle, Send, MessageCircle, Edit, CheckCircle,
  Eye
} from 'lucide-react';
import type { Database } from '../../types/database';
import { STATUS_CONFIG } from '../../types/proposals';
import { getLatestProposal } from '../../lib/api/proposals';
import { formatRelativeTime, getDaysRemaining, isProposalExpired, formatCurrency } from '../../lib/proposalUtils';

type Query = Database['public']['Tables']['queries']['Row'];
type QueryProposal = Database['public']['Tables']['query_proposals']['Row'];

interface QueryCardProps {
  query: Query;
  onView: () => void;
  onStatusChange: (newStatus: string) => void;
  onSendProposal?: () => void;
  onLogResponse?: () => void;
  isUrgent?: boolean;
}

export default function QueryCard({
  query,
  onView,
  onStatusChange: _onStatusChange,
  onSendProposal,
  onLogResponse,
  isUrgent = false
}: QueryCardProps) {
  const [latestProposal, setLatestProposal] = useState<QueryProposal | null>(null);

  useEffect(() => {
    if (['Proposal Sent', 'Revisions Requested', 'Finalized & Booking'].includes(query.status)) {
      loadLatestProposal();
    }
  }, [query.id, query.current_proposal_version]);

  const loadLatestProposal = async () => {
    try {
      const proposal = await getLatestProposal(query.id);
      setLatestProposal(proposal);
    } catch (error) {
      console.error('Error loading proposal:', error);
    }
  };

  const statusConfig = STATUS_CONFIG[query.status as keyof typeof STATUS_CONFIG] || {
    color: 'bg-gray-100 text-gray-800',
    icon: '📋'
  };

  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  const hoursSince = () => {
    const hours = Math.floor((new Date().getTime() - new Date(query.created_at).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const renderQuickAction = () => {
    switch (query.status) {
      case 'Working on Proposal':
        return onSendProposal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendProposal();
            }}
            className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Send className="w-4 h-4 mr-1" />
            Send Proposal
          </button>
        );

      case 'Proposal Sent':
        return onLogResponse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogResponse();
            }}
            className="flex items-center px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Log Response
          </button>
        );

      case 'Revisions Requested':
        return onSendProposal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendProposal();
            }}
            className="flex items-center px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <Edit className="w-4 h-4 mr-1" />
            Revise Proposal
          </button>
        );

      case 'Finalized & Booking':
        return (
          <div className="flex items-center text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4 mr-1" />
            Ready to book
          </div>
        );

      default:
        return null;
    }
  };

  const proposalExpired = latestProposal?.valid_until ? isProposalExpired(latestProposal.valid_until) : false;
  const daysLeft = latestProposal?.valid_until ? getDaysRemaining(latestProposal.valid_until) : 0;

  return (
    <div
      onClick={onView}
      className={`bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border ${
        isUrgent ? 'border-2 border-red-300' : 'border-gray-200'
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{query.client_name}</h3>
              {isUrgent && (
                <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full animate-pulse">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  URGENT
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-mono">{query.query_number}</span>
              <span className="mx-2">•</span>
              <span>{hoursSince()}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <span className="mr-1">{statusConfig.icon}</span>
            {query.status}
          </div>
        </div>

        {/* Key Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
            <span className="font-medium">{query.destination}</span>
            {query.service_type && (
              <>
                <span className="mx-2">•</span>
                <span>{query.service_type}</span>
              </>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span>{passengerText}</span>
          </div>

          {query.travel_date && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                {format(new Date(query.travel_date), 'MMM dd, yyyy')}
                {query.return_date && ` - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`}
              </span>
              {query.is_tentative_dates && (
                <span className="ml-2 text-xs text-yellow-600">(Tentative)</span>
              )}
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2 text-gray-400" />
            <span>{query.client_phone}</span>
            {query.client_email && (
              <>
                <Mail className="w-4 h-4 ml-3 mr-1 text-gray-400" />
                <span className="truncate">{query.client_email}</span>
              </>
            )}
          </div>
        </div>

        {/* Proposal Status */}
        {query.status === 'Proposal Sent' && latestProposal && (
          <div className={`mb-4 p-3 rounded-lg border ${
            proposalExpired
              ? 'bg-red-50 border-red-200'
              : daysLeft <= 2
              ? 'bg-orange-50 border-orange-200'
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className={`w-4 h-4 ${
                  proposalExpired ? 'text-red-600' : daysLeft <= 2 ? 'text-orange-600' : 'text-purple-600'
                }`} />
                <span className={`font-medium ${
                  proposalExpired ? 'text-red-900' : daysLeft <= 2 ? 'text-orange-900' : 'text-purple-900'
                }`}>
                  Proposal v{latestProposal.version_number}
                </span>
              </div>
              <span className={`text-xs ${
                proposalExpired ? 'text-red-700' : daysLeft <= 2 ? 'text-orange-700' : 'text-purple-700'
              }`}>
                {proposalExpired
                  ? 'Expired'
                  : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                }
              </span>
            </div>
            <div className={`text-xs mt-1 ${
              proposalExpired ? 'text-red-700' : daysLeft <= 2 ? 'text-orange-700' : 'text-purple-700'
            }`}>
              Sent {formatRelativeTime(latestProposal.sent_date)} via {latestProposal.sent_via.join(', ')}
            </div>
          </div>
        )}

        {query.status === 'Revisions Requested' && latestProposal?.customer_feedback && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-xs font-medium text-orange-900 mb-1">Customer Feedback:</div>
            <div className="text-sm text-orange-700 line-clamp-2">{latestProposal.customer_feedback}</div>
          </div>
        )}

        {query.status === 'Finalized & Booking' && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-green-900">Package Finalized</div>
              {query.advance_payment_amount && (
                <div className="text-sm text-green-700">
                  Advance: {formatCurrency(query.advance_payment_amount)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing (if available) */}
        {query.selling_price > 0 && (
          <div className="mb-4 pt-3 border-t flex items-center justify-between">
            <span className="text-sm text-gray-600">Package Price:</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(query.selling_price)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {renderQuickAction()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
