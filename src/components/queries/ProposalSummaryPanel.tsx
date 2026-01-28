import React, { useEffect, useState } from 'react';
import { Send, Edit, X, MessageCircle, Eye, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '../../types/database';
import type { ProposalCalculation } from '../../types/proposals';
import { formatCurrency, getDaysRemaining, isProposalExpired } from '../../lib/proposalUtils';
import { getLatestProposal, getQueryServicesForProposal } from '../../lib/api/proposals';
import { calculateProposalTotals } from '../../lib/proposalUtils';

type Query = Database['public']['Tables']['queries']['Row'];
type QueryProposal = Database['public']['Tables']['query_proposals']['Row'];

interface ProposalSummaryPanelProps {
  query: Query;
  onSendProposal: () => void;
  onLogResponse: () => void;
  onFinalize: () => void;
}

export default function ProposalSummaryPanel({
  query,
  onSendProposal,
  onLogResponse,
  onFinalize
}: ProposalSummaryPanelProps) {
  const [latestProposal, setLatestProposal] = useState<QueryProposal | null>(null);
  const [calculation, setCalculation] = useState<ProposalCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProposalData();
  }, [query.id, query.current_proposal_version]);

  const loadProposalData = async () => {
    try {
      // Get services for calculation
      const services = await getQueryServicesForProposal(query.id);
      const totalPassengers = query.adults + query.children + query.infants;
      const calc = calculateProposalTotals(services, totalPassengers);
      setCalculation(calc);

      // Get latest proposal if exists
      const proposal = await getLatestProposal(query.id);
      setLatestProposal(proposal);
    } catch (error) {
      console.error('Error loading proposal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show panel for early statuses
  const shouldShowPanel = [
    'Working on Proposal',
    'Proposal Sent',
    'Revisions Requested',
    'Finalized & Booking',
    'Services Booked',
    'In Delivery',
    'Completed'
  ].includes(query.status);

  if (!shouldShowPanel || !calculation) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  const totalPassengers = query.adults + query.children + query.infants;
  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  const travelDates = query.travel_date && query.return_date
    ? `${format(new Date(query.travel_date), 'MMM dd')} - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`
    : query.travel_date
    ? format(new Date(query.travel_date), 'MMM dd, yyyy')
    : 'To be confirmed';

  const showRevisionBanner = query.status === 'Revisions Requested' && latestProposal?.customer_feedback;
  const showProposalStatus = latestProposal && ['Proposal Sent', 'Revisions Requested'].includes(query.status);
  const daysRemaining = latestProposal?.valid_until ? getDaysRemaining(latestProposal.valid_until) : 0;
  const expired = latestProposal?.valid_until ? isProposalExpired(latestProposal.valid_until) : false;

  return (
    <div className="space-y-4">
      {/* Revision Banner */}
      {showRevisionBanner && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-orange-800">Revisions Requested</h4>
              <p className="text-sm text-orange-700 mt-1">{latestProposal.customer_feedback}</p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => {/* Navigate to services */}}
                  className="text-sm font-medium text-orange-800 hover:text-orange-900"
                >
                  Edit Services
                </button>
                <button
                  onClick={onSendProposal}
                  className="text-sm font-medium text-orange-800 hover:text-orange-900"
                >
                  Send Revised Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Summary Panel */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Package Proposal</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Proposal Version Info */}
          {latestProposal && (
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <div className="text-sm text-gray-500">Proposal Version:</div>
                <div className="font-semibold text-gray-900">v{latestProposal.version_number} (Latest)</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Created:</div>
                <div className="font-medium text-gray-900">
                  {format(new Date(latestProposal.sent_date), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Customer</div>
              <div className="font-medium text-gray-900">{query.client_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="font-medium text-gray-900">{query.client_phone}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Destination</div>
              <div className="font-medium text-gray-900">{query.destination}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Passengers</div>
              <div className="font-medium text-gray-900">{passengerText}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-500">Travel Dates</div>
              <div className="font-medium text-gray-900">{travelDates}</div>
            </div>
          </div>

          {/* Services Included */}
          {calculation.services.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Services Included:</h4>
              <div className="space-y-3">
                {calculation.services.map(service => {
                  const serviceIcons: Record<string, string> = {
                    'Hotel': '🏨',
                    'Flight': '✈️',
                    'Transport': '🚗',
                    'Visa': '📋',
                    'Insurance': '🛡️',
                    'Tour': '🎯',
                    'Other': '📦'
                  };
                  const icon = serviceIcons[service.service_type] || '📦';

                  return (
                    <div key={service.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{icon}</span>
                          <span className="font-medium text-gray-900">{service.service_type}</span>
                        </div>
                        <div className="text-sm text-gray-600 ml-7">{service.service_description}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-gray-900">{formatCurrency(service.selling_amount_pkr)}</div>
                        <div className="text-xs text-gray-500">per person</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Package Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-indigo-900 mb-2">Package Summary</h4>
            <div className="flex justify-between text-sm">
              <span className="text-indigo-700">Total Services:</span>
              <span className="font-medium text-indigo-900">{calculation.totalServices}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-indigo-700">Total Package:</span>
              <span className="font-bold text-indigo-900 text-lg">{formatCurrency(calculation.totalSelling)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-indigo-700">Per Person Cost:</span>
              <span className="font-medium text-indigo-900">{formatCurrency(calculation.perPersonCost)}</span>
            </div>
            <div className="border-t border-indigo-200 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-700">Our Cost:</span>
                <span className="font-medium text-indigo-900">{formatCurrency(calculation.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-indigo-700">Our Profit:</span>
                <span className="font-medium text-indigo-900">
                  {formatCurrency(calculation.totalProfit)} ({calculation.profitPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Proposal Status */}
          {showProposalStatus && (
            <div className={`p-4 rounded-lg border ${
              expired
                ? 'bg-red-50 border-red-200'
                : daysRemaining <= 2
                ? 'bg-orange-50 border-orange-200'
                : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-4 h-4 ${
                      expired ? 'text-red-600' : daysRemaining <= 2 ? 'text-orange-600' : 'text-purple-600'
                    }`} />
                    <span className={`font-medium ${
                      expired ? 'text-red-900' : daysRemaining <= 2 ? 'text-orange-900' : 'text-purple-900'
                    }`}>
                      {expired ? 'Proposal Expired' : 'Awaiting Response'}
                    </span>
                  </div>
                  <div className={`text-sm mt-1 ${
                    expired ? 'text-red-700' : daysRemaining <= 2 ? 'text-orange-700' : 'text-purple-700'
                  }`}>
                    {expired
                      ? 'This proposal has expired. Send a new one or extend validity.'
                      : `Valid for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}`
                    }
                  </div>
                </div>
                <button
                  onClick={onLogResponse}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    expired
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : daysRemaining <= 2
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  } transition`}
                >
                  <MessageCircle className="w-4 h-4 inline mr-1" />
                  Log Response
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {query.status === 'Working on Proposal' && (
              <button
                onClick={onSendProposal}
                className="flex-1 flex items-center justify-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Proposal
              </button>
            )}
            {query.status === 'Revisions Requested' && (
              <>
                <button
                  onClick={() => {/* Navigate to services */}}
                  className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Services
                </button>
                <button
                  onClick={onSendProposal}
                  className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Revised Proposal
                </button>
              </>
            )}
            {query.status === 'Proposal Sent' && (
              <div className="flex-1 flex space-x-3">
                <button
                  onClick={onLogResponse}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Customer Responded?
                </button>
                <button
                  onClick={() => {/* View proposal */}}
                  className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </button>
              </div>
            )}
            {query.status === 'Finalized & Booking' && (
              <div className="flex-1 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Package Finalized - Ready to Book
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
