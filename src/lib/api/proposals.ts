// Proposal Management API Functions

import { supabase } from '../supabase';
import type { Database } from '../../types/database';
import type {
  SendProposalData,
  CustomerResponseData,
  ProposalService
} from '../../types/proposals';
import { calculateValidityDate } from '../proposalUtils';

type QueryProposal = Database['public']['Tables']['query_proposals']['Row'];
type QueryProposalInsert = Database['public']['Tables']['query_proposals']['Insert'];
type QueryProposalUpdate = Database['public']['Tables']['query_proposals']['Update'];

/**
 * Get next proposal version number for a query
 */
export async function getNextProposalVersion(queryId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_next_proposal_version', {
    p_query_id: queryId
  });

  if (error) {
    console.error('Error getting next proposal version:', error);
    throw error;
  }

  return data || 1;
}

/**
 * Create and send a new proposal
 */
export async function createProposal(
  proposalData: SendProposalData,
  userId: string
): Promise<QueryProposal> {
  const validUntil = calculateValidityDate(proposalData.validityDays);

  const proposalInsert: QueryProposalInsert = {
    query_id: proposalData.queryId,
    version_number: proposalData.versionNumber,
    proposal_text: proposalData.proposalText,
    services_snapshot: proposalData.servicesSnapshot as any,
    total_amount: proposalData.totalAmount,
    cost_amount: proposalData.costAmount,
    profit_amount: proposalData.profitAmount,
    profit_percentage: proposalData.profitPercentage,
    sent_date: new Date().toISOString(),
    sent_via: proposalData.sentVia,
    validity_days: proposalData.validityDays,
    valid_until: validUntil,
    status: 'sent',
    created_by: userId
  };

  const { data, error } = await supabase
    .from('query_proposals')
    .insert(proposalInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }

  // Update query with proposal info
  await supabase
    .from('queries')
    .update({
      status: 'Proposal Sent',
      proposal_sent_date: new Date().toISOString(),
      current_proposal_version: proposalData.versionNumber
    })
    .eq('id', proposalData.queryId);

  return data;
}

/**
 * Get all proposals for a query
 */
export async function getQueryProposals(queryId: string): Promise<QueryProposal[]> {
  const { data, error } = await supabase
    .from('query_proposals')
    .select('*')
    .eq('query_id', queryId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get latest proposal for a query
 */
export async function getLatestProposal(queryId: string): Promise<QueryProposal | null> {
  const { data, error } = await supabase
    .from('query_proposals')
    .select('*')
    .eq('query_id', queryId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No proposals found
      return null;
    }
    console.error('Error fetching latest proposal:', error);
    throw error;
  }

  return data;
}

/**
 * Get a specific proposal by ID
 */
export async function getProposal(proposalId: string): Promise<QueryProposal | null> {
  const { data, error } = await supabase
    .from('query_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error) {
    console.error('Error fetching proposal:', error);
    throw error;
  }

  return data;
}

/**
 * Update proposal with customer response
 */
export async function updateProposalResponse(
  responseData: CustomerResponseData
): Promise<QueryProposal> {
  const { proposalId, responseType, feedback, responseDate } = responseData;

  // Determine proposal status based on response type
  let proposalStatus: 'accepted' | 'rejected' | 'sent' = 'sent';
  let queryStatus = 'Proposal Sent';

  switch (responseType) {
    case 'accepted':
      proposalStatus = 'accepted';
      queryStatus = 'Finalized & Booking';
      break;
    case 'rejected':
      proposalStatus = 'rejected';
      queryStatus = 'Cancelled';
      break;
    case 'wants_changes':
      proposalStatus = 'revised';
      queryStatus = 'Revisions Requested';
      break;
    case 'needs_time':
      proposalStatus = 'sent';
      queryStatus = 'Proposal Sent';
      break;
  }

  const updateData: QueryProposalUpdate = {
    customer_response: responseType,
    customer_feedback: feedback,
    response_date: responseDate,
    status: proposalStatus
  };

  const { data, error } = await supabase
    .from('query_proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('Error updating proposal response:', error);
    throw error;
  }

  // Update query status
  const proposal = await getProposal(proposalId);
  if (proposal) {
    await supabase
      .from('queries')
      .update({ status: queryStatus })
      .eq('id', proposal.query_id);
  }

  return data;
}

/**
 * Mark proposal as revised (when creating new version)
 */
export async function markProposalAsRevised(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from('query_proposals')
    .update({ status: 'revised' })
    .eq('id', proposalId);

  if (error) {
    console.error('Error marking proposal as revised:', error);
    throw error;
  }
}

/**
 * Check for expired proposals and update their status
 */
export async function updateExpiredProposals(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('query_proposals')
    .update({ status: 'expired' })
    .eq('status', 'sent')
    .lt('valid_until', today);

  if (error) {
    console.error('Error updating expired proposals:', error);
    throw error;
  }
}

/**
 * Finalize query with advance payment
 */
export async function finalizeQuery(
  queryId: string,
  advancePayment?: {
    amount: number;
    date: string;
    method: string;
    notes?: string;
  }
): Promise<void> {
  const updateData: any = {
    status: 'Finalized & Booking',
    finalized_date: new Date().toISOString()
  };

  if (advancePayment) {
    updateData.advance_payment_amount = advancePayment.amount;
    updateData.advance_payment_date = advancePayment.date;
  }

  const { error } = await supabase
    .from('queries')
    .update(updateData)
    .eq('id', queryId);

  if (error) {
    console.error('Error finalizing query:', error);
    throw error;
  }

  // If advance payment provided, log it
  if (advancePayment) {
    // You can log to communications or a separate payments table
    // For now, we'll just include it in the query notes
  }
}

/**
 * Get proposal statistics for dashboard
 */
export async function getProposalStats(): Promise<{
  totalSent: number;
  awaitingResponse: number;
  accepted: number;
  revisionsRequested: number;
  expired: number;
}> {
  const { data, error } = await supabase
    .from('query_proposals')
    .select('status');

  if (error) {
    console.error('Error fetching proposal stats:', error);
    return {
      totalSent: 0,
      awaitingResponse: 0,
      accepted: 0,
      revisionsRequested: 0,
      expired: 0
    };
  }

  const stats = {
    totalSent: data.length,
    awaitingResponse: data.filter(p => p.status === 'sent').length,
    accepted: data.filter(p => p.status === 'accepted').length,
    revisionsRequested: data.filter(p => p.status === 'revised').length,
    expired: data.filter(p => p.status === 'expired').length
  };

  return stats;
}

/**
 * Get services for proposal snapshot
 */
export async function getQueryServicesForProposal(
  queryId: string
): Promise<ProposalService[]> {
  // This assumes you have a query_services or vendor_transactions table
  // Adjust based on your actual schema
  const { data, error } = await supabase
    .from('vendor_transactions')
    .select(`
      id,
      service_type,
      service_description,
      city,
      purchase_amount_pkr,
      selling_amount_pkr,
      profit_pkr
    `)
    .eq('query_id', queryId);

  if (error) {
    console.error('Error fetching query services:', error);
    throw error;
  }

  return data || [];
}

/**
 * Log proposal communication
 */
export async function logProposalCommunication(
  queryId: string,
  proposalId: string,
  sentVia: string[],
  userId: string
): Promise<void> {
  // Log to communications table if it exists
  const communicationText = `Proposal sent via ${sentVia.join(', ')}`;

  // Assuming you have a communications table
  const { error } = await supabase
    .from('communications')
    .insert({
      query_id: queryId,
      communication_type: 'proposal_sent',
      communication_method: sentVia[0], // Primary method
      message: communicationText,
      created_by: userId
    });

  if (error) {
    console.error('Error logging communication:', error);
    // Don't throw - this is not critical
  }
}
