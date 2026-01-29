import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Phone, Mail, Users,
  AlertCircle, CheckCircle, Clock, Target, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import StageIndicator from './StageIndicator';
import ProposalSummaryPanel from './ProposalSummaryPanel';
import {
  BookingModeAlert,
  BookingProgressTracker,
  VendorPaymentSummary
} from './booking';

interface Query {
  id: string;
  query_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string;
  query_source: string | null;
  service_type: string | null;
  destination: string;
  travel_date: string | null;
  return_date: string | null;
  is_tentative_dates: boolean;
  adults: number;
  children: number;
  infants: number;
  tentative_plan: string | null;
  internal_reminders: string | null;
  is_responded: boolean;
  response_given: string | null;
  status: string;
  priority_level: string;
  follow_up_date: string | null;
  notes: string | null;
  cost_price: number;
  selling_price: number;
  profit: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

// Development mode toggle
const DEV_MODE = import.meta.env.DEV;

export default function QueryWorkspace() {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState<Query | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryId) {
      loadQueryData();
      loadServices();
    }
  }, [queryId]);

  // Force re-render when query status changes
  useEffect(() => {
    if (query) {
      console.log('🔄 Query status changed, re-rendering UI for:', query.status);
    }
  }, [query?.status]);

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
      const { data, error: fetchError } = await supabase
        .from('queries')
        .select('*')
        .eq('id', queryId)
        .single();

      if (fetchError) throw fetchError;
      setQuery(data);
    } catch (err) {
      console.error('Error loading query:', err);
      setError('Failed to load query');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('query_services')
        .select('*')
        .eq('query_id', queryId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setServices(data || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!query) return;

    console.log('🔄 Starting status change from:', query.status, 'to:', newStatus);

    try {
      const { error: updateError } = await supabase
        .from('queries')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', query.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }

      console.log('✅ Database updated successfully');

      // Reload query data to refresh UI
      await loadQueryData();
      await loadServices();

      console.log('✅ Status changed to:', newStatus);
      console.log('✅ UI should now show sections for:', newStatus);
    } catch (err) {
      console.error('❌ Error updating status:', err);
      alert('Failed to update status: ' + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading query...</p>
        </div>
      </div>
    );
  }

  if (error || !query) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Query not found'}</p>
          <button
            onClick={() => navigate('/queries')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Queries
          </button>
        </div>
      </div>
    );
  }

  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/queries')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Query #{query.query_number}
                </h1>
                <p className="text-sm text-gray-600">{query.client_name}</p>
              </div>
            </div>

            {/* Status Dropdown */}
            <select
              value={query.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="New Query - Not Responded">🔴 New Query (Not Responded)</option>
              <option value="Responded - Awaiting Reply">🟡 Awaiting Client Reply</option>
              <option value="Working on Proposal">🔵 Working on Proposal</option>
              <option value="Proposal Sent">🟢 Proposal Sent</option>
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
        {/* Debug Info (always visible in dev mode) */}
        {DEV_MODE && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 text-sm">
            <div className="font-bold text-purple-900 mb-2">🐛 DEBUG INFO:</div>
            <div className="space-y-1 text-purple-800">
              <div>Current Status: <span className="font-mono font-bold">"{query.status}"</span></div>
              <div>Services Count: {services.length}</div>
              <div className="mt-2 font-semibold">Sections that should be visible:</div>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {['New Query - Not Responded', 'Responded - Awaiting Reply', 'Working on Proposal'].includes(query.status) && (
                  <li className="text-green-700">✅ Service Addition (Stages 1-3)</li>
                )}
                {query.status === 'Proposal Sent' && (
                  <li className="text-green-700">✅ Proposal Sent Section</li>
                )}
                {query.status === 'Revisions Requested' && (
                  <li className="text-green-700">✅ Revisions Section</li>
                )}
                {query.status === 'Finalized & Booking' && (
                  <li className="text-green-700">✅ Booking Section</li>
                )}
                {query.status === 'Services Booked' && (
                  <li className="text-green-700">✅ Services Booked Section</li>
                )}
                {query.status === 'In Delivery' && (
                  <li className="text-green-700">✅ In Delivery Section</li>
                )}
                {query.status === 'Completed' && (
                  <li className="text-green-700">✅ Completed Section</li>
                )}
                {query.status === 'Cancelled' && (
                  <li className="text-green-700">✅ Cancelled Section</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Stage Indicator */}
        <StageIndicator status={query.status} />

        {/* Basic Query Information - Always show */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm font-medium text-gray-900">{query.client_phone}</div>
              </div>
            </div>

            {query.client_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm font-medium text-gray-900">{query.client_email}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Destination</div>
                <div className="text-sm font-medium text-gray-900">{query.destination}</div>
              </div>
            </div>

            {query.travel_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Travel Dates</div>
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(query.travel_date), 'MMM dd, yyyy')}
                    {query.return_date && ` - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Passengers</div>
                <div className="text-sm font-medium text-gray-900">{passengerText}</div>
              </div>
            </div>

            {query.service_type && (
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Service Type</div>
                  <div className="text-sm font-medium text-gray-900">{query.service_type}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STAGE 1-3: Service Addition */}
        {['New Query - Not Responded', 'Responded - Awaiting Reply', 'Working on Proposal'].includes(query.status) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Build Package Proposal</h2>
            <p className="text-gray-600 mb-4">
              Add services to create a package proposal for this customer.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Next Step:</strong> Add services (hotels, flights, transport) to build the proposal.
                Once services are added, you can send the proposal to the customer.
              </p>
            </div>

            {/* Placeholder for services */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No services added yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Service addition feature coming soon
              </p>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Add Service
              </button>
            </div>

            {services.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => handleStatusChange('Proposal Sent')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Send Proposal to Customer
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE 4: Proposal Sent */}
        {query.status === 'Proposal Sent' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Proposal Sent</p>
                  <p className="text-sm text-green-700 mt-1">
                    Proposal has been sent to customer. Awaiting their response.
                  </p>
                </div>
              </div>
            </div>

            <ProposalSummaryPanel
              query={query as any}
              onSendProposal={() => handleStatusChange('Proposal Sent')}
              onLogResponse={() => console.log('Log response clicked')}
              onFinalize={() => handleStatusChange('Finalized & Booking')}
            />

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Next Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusChange('Revisions Requested')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Customer Requested Changes
                </button>
                <button
                  onClick={() => handleStatusChange('Finalized & Booking')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Customer Approved - Start Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: Revisions Requested */}
        {query.status === 'Revisions Requested' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Revisions Requested</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Customer requested changes to the proposal. Make necessary updates and resend.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Customer Feedback</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Customer feedback will appear here</p>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2 mt-6">Edit Services</h3>
              <p className="text-sm text-gray-600 mb-4">
                Update services based on customer feedback, then send revised proposal.
              </p>

              <button
                onClick={() => handleStatusChange('Proposal Sent')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Revised Proposal
              </button>
            </div>
          </div>
        )}

        {/* STAGE 6: Finalized & Booking */}
        {query.status === 'Finalized & Booking' && (
          <div className="space-y-6">
            <BookingModeAlert queryStatus={query.status} />

            <BookingProgressTracker
              services={services}
              className="bg-white"
            />

            <VendorPaymentSummary queryId={query.id} />

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Services to Book</h3>

              {services.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p>No services to book. Add services first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{service.service_description}</h4>
                      <p className="text-sm text-gray-600">{service.service_type}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Booking features coming in Phase B integration
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAGE 7: Services Booked */}
        {query.status === 'Services Booked' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">All Services Booked!</p>
                  <p className="text-sm text-green-700 mt-1">
                    All bookings confirmed. Ready to deliver services.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Documents</h3>
              <p className="text-sm text-gray-600 mb-4">
                All booking confirmations and vouchers will appear here.
              </p>

              <button
                onClick={() => handleStatusChange('In Delivery')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Service Delivery Tracking
              </button>
            </div>
          </div>
        )}

        {/* STAGE 8: In Delivery */}
        {query.status === 'In Delivery' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Services In Delivery</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Customer is currently using the services. Track delivery status.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Service Delivery Tracker</h3>
              <p className="text-sm text-gray-600 mb-4">
                Track service delivery status and customer satisfaction.
              </p>

              <button
                onClick={() => handleStatusChange('Completed')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Completed
              </button>
            </div>
          </div>
        )}

        {/* STAGE 9: Completed */}
        {query.status === 'Completed' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Query Completed Successfully!</p>
                  <p className="text-sm text-green-700 mt-1">
                    All services delivered. Customer journey complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Completion Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Cost Price</div>
                  <div className="text-2xl font-bold text-gray-900">
                    Rs {query.cost_price.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Selling Price</div>
                  <div className="text-2xl font-bold text-gray-900">
                    Rs {query.selling_price.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">Profit</div>
                  <div className="text-2xl font-bold text-green-700">
                    Rs {query.profit.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {query.profit_margin.toFixed(1)}% margin
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                This query has been successfully completed. All financial transactions are recorded.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 10: Cancelled */}
        {query.status === 'Cancelled' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Query Cancelled</p>
                  <p className="text-sm text-red-700 mt-1">
                    This query was cancelled or lost.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Cancellation Details</h3>
              {query.notes && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">{query.notes}</p>
                </div>
              )}
              <p className="text-sm text-gray-600">
                This query is archived and no further actions are needed.
              </p>
            </div>
          </div>
        )}

        {/* Development/Testing Panel */}
        {DEV_MODE && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              🔧 Development: Test Stage Transitions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                onClick={() => handleStatusChange('Working on Proposal')}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                → Working
              </button>
              <button
                onClick={() => handleStatusChange('Proposal Sent')}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                → Proposal Sent
              </button>
              <button
                onClick={() => handleStatusChange('Finalized & Booking')}
                className="px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
              >
                → Booking
              </button>
              <button
                onClick={() => handleStatusChange('Services Booked')}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                → Booked
              </button>
              <button
                onClick={() => handleStatusChange('Completed')}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                → Completed
              </button>
            </div>
            <p className="text-xs text-yellow-700 mt-3">
              This panel is only visible in development mode for testing purposes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
