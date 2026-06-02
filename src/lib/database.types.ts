// Typed Postgres schema for the Supabase client.
//
// This is hand-maintained for the tables the app touches. It mirrors
// database/complete-schema.sql. Once the Supabase project is linked you can
// regenerate the full file with:
//   supabase gen types typescript --linked > src/lib/database.types.ts
//
// Money columns are NUMERIC in Postgres and arrive as `number` over the wire,
// but all money *math* must go through $lib/money — never raw arithmetic.

export type QueryStatus =
	| 'New Query - Not Responded'
	| 'Responded - Awaiting Reply'
	| 'Working on Proposal'
	| 'Proposal Sent'
	| 'Revisions Requested'
	| 'Finalized & Booking'
	| 'Services Booked'
	| 'In Delivery'
	| 'Completed'
	| 'Cancelled';

export type Currency = 'PKR' | 'SAR' | 'USD' | 'AED' | 'EUR' | 'GBP';

export type UserRole = 'admin' | 'manager' | 'agent' | 'finance' | 'viewer';

export type ServiceType = 'Flight' | 'Hotel' | 'Visa' | 'Transport' | 'Tour' | 'Insurance' | 'Other';

export type ServiceStatus = 'pending' | 'confirmed' | 'cancelled';

export type BookingStatus = 'pending' | 'payment_sent' | 'confirmed' | 'cancelled';

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					email: string;
					full_name: string;
					role: UserRole;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					full_name: string;
					role?: UserRole;
				};
				Update: Partial<Database['public']['Tables']['users']['Insert']>;
				Relationships: [];
			};
			queries: {
				Row: {
					id: string;
					query_number: string;
					client_name: string;
					client_email: string | null;
					client_phone: string;
					destination: string;
					travel_date: string | null;
					return_date: string | null;
					adults: number;
					children: number;
					infants: number;
					status: QueryStatus;
					assigned_to: string | null;
					notes: string | null;
					cost_price: number;
					selling_price: number;
					profit: number;
					profit_margin: number;
					proposal_sent_date: string | null;
					finalized_date: string | null;
					completed_date: string | null;
					current_proposal_version: number | null;
					advance_payment_amount: number | null;
					advance_payment_date: string | null;
					customer_feedback: string | null;
					stage_notes: Record<string, unknown>;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					client_name: string;
					client_phone: string;
					destination: string;
					client_email?: string | null;
					travel_date?: string | null;
					return_date?: string | null;
					adults?: number;
					children?: number;
					infants?: number;
					status?: QueryStatus;
					assigned_to?: string | null;
					notes?: string | null;
					cost_price?: number;
					selling_price?: number;
				};
				Update: Partial<Database['public']['Tables']['queries']['Insert']>;
				Relationships: [];
			};
			vendors: {
				Row: {
					id: string;
					name: string;
					type: string;
					contact_person: string | null;
					email: string | null;
					phone: string | null;
					whatsapp_number: string | null;
					address: string | null;
					balance: number;
					rating: number | null;
					notes: string | null;
					total_business: number;
					total_paid: number;
					total_pending: number;
					total_profit: number;
					service_types: string[];
					location: string | null;
					country: string | null;
					tags: string[];
					is_active: boolean;
					is_deleted: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					type: string;
					contact_person?: string | null;
					email?: string | null;
					phone?: string | null;
				};
				Update: Partial<Database['public']['Tables']['vendors']['Insert']>;
				Relationships: [];
			};
			passengers: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					email: string | null;
					phone: string;
					whatsapp: string | null;
					cnic: string | null;
					gender: 'male' | 'female' | null;
					city: string | null;
					country: string;
					passport_number: string | null;
					passport_expiry: string | null;
					date_of_birth: string | null;
					nationality: string | null;
					tags: string[];
					status: 'active' | 'inactive';
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					phone: string;
					email?: string | null;
				};
				Update: Partial<Database['public']['Tables']['passengers']['Insert']>;
				Relationships: [];
			};
			query_services: {
				Row: {
					id: string;
					query_id: string;
					service_type: ServiceType;
					service_description: string;
					vendor: string | null;
					vendor_id: string | null;
					quantity: number;
					cost_price: number;
					selling_price: number;
					pnr: string | null;
					booking_reference: string | null;
					status: ServiceStatus;
					booking_status: BookingStatus;
					service_date: string | null;
					service_details: Record<string, unknown>;
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					query_id: string;
					service_type: ServiceType;
					service_description: string;
					vendor?: string | null;
					vendor_id?: string | null;
					quantity?: number;
					cost_price?: number;
					selling_price?: number;
					status?: ServiceStatus;
					booking_status?: BookingStatus;
					service_date?: string | null;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['query_services']['Insert']>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
}
