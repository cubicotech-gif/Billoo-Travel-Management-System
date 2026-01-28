import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, MessageCircle, FileText, Edit3, CheckCircle, Package, Truck, Check } from 'lucide-react';
import type { Database } from '../../types/database';
import { getQueryProposals } from '../../lib/api/proposals';

type Query = Database['public']['Tables']['queries']['Row'];
type QueryProposal = Database['public']['Tables']['query_proposals']['Row'];

interface QueryTimelineProps {
  query: Query;
}

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'proposal_sent' | 'proposal_response' | 'finalized';
  title: string;
  description?: string;
  date: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

export default function QueryTimeline({ query }: QueryTimelineProps) {
  const [proposals, setProposals] = useState<QueryProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, [query.id]);

  const loadProposals = async () => {
    try {
      const data = await getQueryProposals(query.id);
      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build timeline events from query data and proposals
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Query created
    events.push({
      id: 'created',
      type: 'status_change',
      title: 'Query Created',
      date: query.created_at,
      icon: FileText,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    });

    // Responded to customer
    if (query.is_responded) {
      events.push({
        id: 'responded',
        type: 'status_change',
        title: 'Responded to Customer',
        description: query.response_given || undefined,
        date: query.created_at, // You might want a separate response_date field
        icon: MessageCircle,
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100'
      });
    }

    // Working on proposal
    if (query.status === 'Working on Proposal' || proposals.length > 0) {
      events.push({
        id: 'working',
        type: 'status_change',
        title: 'Working on Proposal',
        date: query.updated_at,
        icon: Edit3,
        iconColor: 'text-yellow-600',
        iconBg: 'bg-yellow-100'
      });
    }

    // Proposals sent
    proposals.forEach(proposal => {
      events.push({
        id: `proposal-${proposal.id}`,
        type: 'proposal_sent',
        title: `Proposal Sent (v${proposal.version_number})`,
        description: `Via ${proposal.sent_via.join(', ')}`,
        date: proposal.sent_date,
        icon: FileText,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-100'
      });

      // Proposal responses
      if (proposal.customer_response) {
        let responseTitle = '';
        let icon = MessageCircle;
        let iconColor = 'text-gray-600';
        let iconBg = 'bg-gray-100';

        switch (proposal.customer_response) {
          case 'accepted':
            responseTitle = 'Proposal Accepted';
            icon = CheckCircle;
            iconColor = 'text-green-600';
            iconBg = 'bg-green-100';
            break;
          case 'wants_changes':
            responseTitle = 'Revisions Requested';
            icon = Edit3;
            iconColor = 'text-orange-600';
            iconBg = 'bg-orange-100';
            break;
          case 'rejected':
            responseTitle = 'Proposal Rejected';
            icon = FileText;
            iconColor = 'text-red-600';
            iconBg = 'bg-red-100';
            break;
          case 'needs_time':
            responseTitle = 'Customer Needs More Time';
            icon = Clock;
            iconColor = 'text-blue-600';
            iconBg = 'bg-blue-100';
            break;
        }

        if (proposal.response_date) {
          events.push({
            id: `response-${proposal.id}`,
            type: 'proposal_response',
            title: responseTitle,
            description: proposal.customer_feedback || undefined,
            date: proposal.response_date,
            icon,
            iconColor,
            iconBg
          });
        }
      }
    });

    // Finalized
    if (query.finalized_date) {
      events.push({
        id: 'finalized',
        type: 'finalized',
        title: 'Package Finalized',
        description: query.advance_payment_amount
          ? `Advance payment: Rs ${query.advance_payment_amount.toLocaleString()}`
          : undefined,
        date: query.finalized_date,
        icon: CheckCircle,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-100'
      });
    }

    // Services booked
    if (query.status === 'Services Booked') {
      events.push({
        id: 'booked',
        type: 'status_change',
        title: 'Services Booked',
        date: query.updated_at,
        icon: Package,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-100'
      });
    }

    // In delivery
    if (query.status === 'In Delivery') {
      events.push({
        id: 'delivery',
        type: 'status_change',
        title: 'In Delivery',
        date: query.updated_at,
        icon: Truck,
        iconColor: 'text-cyan-600',
        iconBg: 'bg-cyan-100'
      });
    }

    // Completed
    if (query.status === 'Completed') {
      events.push({
        id: 'completed',
        type: 'status_change',
        title: 'Completed',
        date: query.updated_at,
        icon: Check,
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100'
      });
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const timeline = buildTimeline();
  const currentEventIndex = timeline.length - 1;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Timeline</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Query Timeline</h3>
        <p className="text-sm text-gray-500 mt-1">Complete history of this query</p>
      </div>

      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {timeline.map((event, eventIdx) => {
              const Icon = event.icon;
              const isLast = eventIdx === timeline.length - 1;
              const isCurrent = eventIdx === currentEventIndex;

              return (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div
                          className={`h-10 w-10 rounded-full ${event.iconBg} flex items-center justify-center ring-8 ring-white`}
                        >
                          <Icon className={`h-5 w-5 ${event.iconColor}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <div className="text-sm">
                            <span className={`font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-700'}`}>
                              {event.title}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {format(new Date(event.date), 'MMM dd, yyyy • h:mm a')}
                          </p>
                        </div>
                        {event.description && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Current Status Indicator */}
        {query.status === 'Proposal Sent' && (
          <div className="mt-6 flex items-center space-x-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <Clock className="w-4 h-4" />
            <span>Awaiting customer response...</span>
          </div>
        )}
        {query.status === 'Revisions Requested' && (
          <div className="mt-6 flex items-center space-x-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <Edit3 className="w-4 h-4" />
            <span>Waiting for proposal revision...</span>
          </div>
        )}
        {query.status === 'Finalized & Booking' && (
          <div className="mt-6 flex items-center space-x-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <Package className="w-4 h-4" />
            <span>Ready to book with vendors...</span>
          </div>
        )}
      </div>
    </div>
  );
}
