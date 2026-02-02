import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Phone, Mail, Users,
  AlertCircle, Clock, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Query, QueryService, QueryStatus } from '../../types/query-workflow';
import StageIndicator from './StageIndicator';

// Import all stage components
import StageServiceBuilding from './stages/StageServiceBuilding';
import StageProposalSent from './stages/StageProposalSent';
import StageRevisions from './stages/StageRevisions';
import StageBooking from './stages/StageBooking';
import StageServicesBooked from './stages/StageServicesBooked';
import StageDelivery from './stages/StageDelivery';
import StageCompleted from './stages/StageCompleted';
import StageCancelled from './stages/StageCancelled';

export default function QueryWorkspace() {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState<Query | null>(null);
  const [services, setServices] = useState<QueryService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryId) {
      loadQueryData();
    }
  }, [queryId]);

  // Add console logging for debugging
  useEffect(() => {
    if (query) {
      console.log('🔍 Current Query Status:', query.status);
      console.log('📊 Services:', services);
    }
  }, [query?.status, services]);

  const loadQueryData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load query
      const { data: queryData, error: queryError } = await supabase
        .from('queries')
        .select('*')
        .eq('id', queryId)
        .single();

      if (queryError) throw queryError;

      // Load services with vendor information
      const { data: servicesData, error: servicesError } = await supabase
        .from('query_services')
        .select(`
          *,
          vendors (id, name, type)
        `)
        .eq('query_id', queryId)
        .order('created_at', { ascending: true });

      if (servicesError) throw servicesError;

      setQuery(queryData);
      setServices(servicesData || []);
    } catch (err: any) {
      console.error('Error loading query:', err);
      setError(err.message || 'Failed to load query');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: QueryStatus) => {
    if (!query) return;

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add timestamp fields based on status
      if (newStatus === 'Proposal Sent' && !query.proposal_sent_date) {
        updates.proposal_sent_date = new Date().toISOString();
      }
      if (newStatus === 'Finalized & Booking' && !query.finalized_date) {
        updates.finalized_date = new Date().toISOString();
      }
      if (newStatus === 'Completed' && !query.completed_date) {
        updates.completed_date = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('queries')
        .update(updates)
        .eq('id', query.id);

      if (updateError) throw updateError;

      // Reload query data to refresh UI
      await loadQueryData();

      console.log('✅ Status changed to:', newStatus);
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleCustomerResponse = async (response: {
    type: 'accepted' | 'revisions' | 'rejected';
    feedback: string;
  }) => {
    if (!query) return;

    try {
      // Update query with customer feedback
      await supabase
        .from('queries')
        .update({
          customer_feedback: response.feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', query.id);

      // Change status based on response type
      if (response.type === 'accepted') {
        await updateStatus('Finalized & Booking');
      } else if (response.type === 'revisions') {
        await updateStatus('Revisions Requested');
      } else if (response.type === 'rejected') {
        await updateStatus('Cancelled');
      }
    } catch (err: any) {
      console.error('Error handling customer response:', err);
      alert('Failed to log customer response: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading query...</p>
        </div>
      </div>
    );
  }

  if (error || !query) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error || 'Query not found'}</p>
          <button
            onClick={() => navigate('/queries')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Queries
          </button>
        </div>
      </div>
    );
  }

  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Always Visible */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/queries')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Queries"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Query #{query.query_number}</h1>
                <p className="text-sm text-gray-600">{query.client_name}</p>
              </div>
            </div>

            {/* Status Dropdown */}
            <select
              value={query.status}
              onChange={(e) => updateStatus(e.target.value as QueryStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="New Query - Not Responded">🔴 New Query (Not Responded)</option>
              <option value="Responded - Awaiting Reply">🟡 Awaiting Client Reply</option>
              <option value="Working on Proposal">🔵 Working on Proposal</option>
              <option value="Proposal Sent">📧 Proposal Sent</option>
              <option value="Revisions Requested">🟣 Revisions Requested</option>
              <option value="Finalized & Booking">✅ Finalized & Booking</option>
              <option value="Services Booked">📦 Services Booked</option>
              <option value="In Delivery">🚚 In Delivery</option>
              <option value="Completed">✅ Completed</option>
              <option value="Cancelled">❌ Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stage Indicator - Always Visible */}
        <StageIndicator status={query.status} />

        {/* Basic Query Information - Always Visible */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm font-medium text-gray-900">{query.client_phone}</div>
              </div>
            </div>

            {query.client_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm font-medium text-gray-900">{query.client_email}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Destination</div>
                <div className="text-sm font-medium text-gray-900">{query.destination}</div>
              </div>
            </div>

            {query.travel_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Travel Dates</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(query.travel_date), 'MMM dd, yyyy')}
                    {query.return_date &&
                      ` - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Passengers</div>
                <div className="text-sm font-medium text-gray-900">{passengerText || 'Not specified'}</div>
              </div>
            </div>

            {query.service_type && (
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Service Type</div>
                  <div className="text-sm font-medium text-gray-900">{query.service_type}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONDITIONAL RENDERING - Stage-Specific Content */}
        <div className="stage-content">
          {renderStageContent()}
        </div>
      </div>
    </div>
  );

  // RENDER STAGE-SPECIFIC CONTENT BASED ON STATUS
  function renderStageContent() {
    const status = query?.status;

    // STAGES 1-3: Initial Contact & Service Building
    if (
      [
        'New Query - Not Responded',
        'Responded - Awaiting Reply',
        'Working on Proposal'
      ].includes(status!)
    ) {
      return (
        <StageServiceBuilding
          query={query!}
          services={services}
          onRefresh={loadQueryData}
          onSendProposal={() => updateStatus('Proposal Sent')}
        />
      );
    }

    // STAGE 4: Proposal Sent
    if (status === 'Proposal Sent') {
      return (
        <StageProposalSent
          query={query!}
          services={services}
          onLogResponse={handleCustomerResponse}
          onRevise={() => updateStatus('Working on Proposal')}
        />
      );
    }

    // STAGE 5: Revisions Requested
    if (status === 'Revisions Requested') {
      return (
        <StageRevisions
          query={query!}
          services={services}
          onRefresh={loadQueryData}
          onSendRevised={() => updateStatus('Proposal Sent')}
        />
      );
    }

    // STAGE 6: Finalized & Booking
    if (status === 'Finalized & Booking') {
      return (
        <StageBooking
          query={query!}
          services={services}
          onRefresh={loadQueryData}
          onAllBooked={() => updateStatus('Services Booked')}
        />
      );
    }

    // STAGE 7: Services Booked
    if (status === 'Services Booked') {
      return (
        <StageServicesBooked
          query={query!}
          services={services}
          onStartDelivery={() => updateStatus('In Delivery')}
        />
      );
    }

    // STAGE 8: In Delivery
    if (status === 'In Delivery') {
      return (
        <StageDelivery
          query={query!}
          services={services}
          onRefresh={loadQueryData}
          onComplete={() => updateStatus('Completed')}
        />
      );
    }

    // STAGE 9: Completed
    if (status === 'Completed') {
      return <StageCompleted query={query!} services={services} />;
    }

    // STAGE 10: Cancelled
    if (status === 'Cancelled') {
      return <StageCancelled query={query!} />;
    }

    // Fallback for unknown status
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <p className="text-amber-900 font-medium">Unknown query status: {status}</p>
        <p className="text-sm text-amber-700 mt-2">
          Please update the query status using the dropdown above.
        </p>
      </div>
    );
  }
}
