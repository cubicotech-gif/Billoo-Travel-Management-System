// ═══════════════════════════════════════════════
// QUERY MODULE — API / SERVICE LAYER
// ═══════════════════════════════════════════════

import { supabase } from '../supabase';
import type {
  Query, QueryService, QueryPassenger, QueryQuote,
  CreateQueryInput, CreateServiceInput, QueryStage, DocumentChecklist
} from '@/types/query';

// ─── QUERY CRUD ────────────────────────────────

export const queryApi = {

  async create(data: CreateQueryInput): Promise<Query> {
    const { data: query, error } = await supabase
      .from('queries')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return query;
  },

  async getById(id: string): Promise<Query> {
    const { data, error } = await supabase
      .from('queries')
      .select('*, primary_passenger:passengers(first_name, last_name, phone)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getAll(filters?: { stage?: string; search?: string }): Promise<Query[]> {
    let query = supabase
      .from('queries')
      .select('*, primary_passenger:passengers(first_name, last_name, phone)')
      .order('created_at', { ascending: false });

    if (filters?.stage && filters.stage !== 'all') {
      query = query.eq('stage', filters.stage);
    }
    if (filters?.search) {
      query = query.or(
        `client_name.ilike.%${filters.search}%,client_phone.ilike.%${filters.search}%,query_number.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async update(id: string, data: Partial<Query>): Promise<Query> {
    const { data: query, error } = await supabase
      .from('queries')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return query;
  },

  async changeStage(id: string, newStage: QueryStage, metadata?: Record<string, any>): Promise<Query> {
    const timestampField: Record<string, string> = {
      quote_sent: 'quote_sent_at',
      confirmed_paying: 'confirmed_at',
      booking_docs: 'booking_started_at',
      ready_to_travel: 'ready_at',
      completed: 'completed_at',
      cancelled: 'cancelled_at',
    };

    const updateData: Record<string, any> = {
      stage: newStage,
      stage_changed_at: new Date().toISOString(),
      ...(timestampField[newStage] ? { [timestampField[newStage]]: new Date().toISOString() } : {}),
      ...(metadata || {}),
    };

    return this.update(id, updateData);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('queries').delete().eq('id', id);
    if (error) throw error;
  },

  async getStageCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('queries')
      .select('stage');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data || []).forEach((q: { stage: string }) => {
      counts[q.stage] = (counts[q.stage] || 0) + 1;
    });
    return counts;
  },
};

// ─── QUERY SERVICES CRUD ────────────────────────

export const queryServiceApi = {

  async add(data: CreateServiceInput): Promise<QueryService> {
    const { data: service, error } = await supabase
      .from('query_services')
      .insert(data)
      .select('*, vendor:vendors(name, phone)')
      .single();
    if (error) throw error;
    return service;
  },

  async update(id: string, data: Partial<QueryService>): Promise<QueryService> {
    const { data: service, error } = await supabase
      .from('query_services')
      .update(data)
      .eq('id', id)
      .select('*, vendor:vendors(name, phone)')
      .single();
    if (error) throw error;
    return service;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('query_services').delete().eq('id', id);
    if (error) throw error;
  },

  async getByQuery(queryId: string): Promise<QueryService[]> {
    const { data, error } = await supabase
      .from('query_services')
      .select('*, vendor:vendors(name, phone)')
      .eq('query_id', queryId)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },
};

// ─── QUERY PASSENGERS ───────────────────────────

export const queryPassengerApi = {

  async add(queryId: string, passengerId: string, type: string, isPrimary: boolean): Promise<QueryPassenger> {
    const { data, error } = await supabase
      .from('query_passengers')
      .insert({ query_id: queryId, passenger_id: passengerId, passenger_type: type, is_primary: isPrimary })
      .select('*, passenger:passengers(id, first_name, last_name, phone, passport_number, passport_expiry)')
      .single();
    if (error) throw error;
    return data;
  },

  async remove(queryId: string, passengerId: string): Promise<void> {
    await supabase.from('document_checklists').delete().match({ query_id: queryId, passenger_id: passengerId });
    const { error } = await supabase.from('query_passengers').delete().match({ query_id: queryId, passenger_id: passengerId });
    if (error) throw error;
  },

  async getByQuery(queryId: string): Promise<QueryPassenger[]> {
    const { data, error } = await supabase
      .from('query_passengers')
      .select('*, passenger:passengers(id, first_name, last_name, phone, passport_number, passport_expiry)')
      .eq('query_id', queryId)
      .order('is_primary', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

// ─── QUERY QUOTES ───────────────────────────────

export const queryQuoteApi = {

  async create(queryId: string, services: QueryService[], sentVia: string): Promise<QueryQuote> {
    const { data: existing } = await supabase
      .from('query_quotes')
      .select('version')
      .eq('query_id', queryId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version || 0) + 1;
    const totalCost = services.reduce((sum, s) => sum + s.cost_price, 0);
    const totalSelling = services.reduce((sum, s) => sum + s.selling_price, 0);

    const { data, error } = await supabase
      .from('query_quotes')
      .insert({
        query_id: queryId,
        version: nextVersion,
        services_snapshot: services,
        total_cost: totalCost,
        total_selling: totalSelling,
        total_profit: totalSelling - totalCost,
        sent_via: sentVia,
      })
      .select()
      .single();
    if (error) throw error;

    await queryApi.update(queryId, { current_quote_version: nextVersion } as Partial<Query>);
    return data;
  },

  async getByQuery(queryId: string): Promise<QueryQuote[]> {
    const { data, error } = await supabase
      .from('query_quotes')
      .select()
      .eq('query_id', queryId)
      .order('version', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

// ─── DOCUMENT CHECKLIST ─────────────────────────

export const checklistApi = {

  async getByQuery(queryId: string): Promise<DocumentChecklist[]> {
    const { data, error } = await supabase
      .from('document_checklists')
      .select('*')
      .eq('query_id', queryId);
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id: string, status: string, documentId?: string): Promise<void> {
    const { error } = await supabase
      .from('document_checklists')
      .update({ status, document_id: documentId || null })
      .eq('id', id);
    if (error) throw error;
  },

  async generateForPassenger(queryId: string, passengerId: string): Promise<void> {
    const defaults = [
      { document_type: 'passport', required: true },
      { document_type: 'passport_photo', required: true },
      { document_type: 'cnic', required: true },
      { document_type: 'vaccination', required: true },
      { document_type: 'visa', required: false },
    ];

    const items = defaults.map(d => ({
      query_id: queryId,
      passenger_id: passengerId,
      ...d,
    }));

    await supabase.from('document_checklists').upsert(items, { onConflict: 'query_id,passenger_id,document_type' });
  },
};
