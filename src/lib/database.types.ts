// Typed Postgres schema for the Supabase client.
//
// This is hand-maintained for the tables the app touches. It mirrors
// database/complete-schema.sql. Once the Supabase project is linked you can
// regenerate the full file with:
//   supabase gen types typescript --linked > src/lib/database.types.ts
//
// Money columns are NUMERIC in Postgres and arrive as `number` over the wire,
// but all money *math* must go through $lib/money — never raw arithmetic.

export type QueryStatus = 'New Query' | 'Working' | 'Quoted' | 'Booking' | 'Cancelled';

// Payment + check-in status, only meaningful while a query is in the Booking stage.
export type BookingStatus =
	| 'Pending Payment'
	| 'Payment Done - Check-in Pending'
	| 'Check-in Done - Payment Pending'
	| 'Partial Payment'
	| 'Completed';

export type Currency = 'PKR' | 'SAR' | 'USD' | 'AED' | 'EUR' | 'GBP';

export type UserRole = 'admin' | 'manager' | 'agent' | 'finance' | 'viewer';

export type PackageType = 'Umrah' | 'Umrah Plus' | 'Tour' | 'Leisure';

export interface CityBlock {
	city: string;
	arrival_date: string | null;
	nights: number;
	hotel_preference: string;
	activities: number;
}

export type DocumentType =
	| 'passport'
	| 'cnic'
	| 'visa'
	| 'photo'
	| 'vaccination'
	| 'mahram'
	| 'ticket'
	| 'voucher'
	| 'invoice'
	| 'receipt'
	| 'other';

export type ServiceType = 'Flight' | 'Hotel' | 'Visa' | 'Transport' | 'Tour' | 'Insurance' | 'Other';

// Daily rate cards: hotel/transfer/visa are SAR, airline is PKR.
export type RateItemType = 'hotel' | 'transfer' | 'visa' | 'airline';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'archived';

export type QuotationLineType = 'hotel' | 'transfer' | 'visa' | 'ticket';

export type ServiceStatus = 'pending' | 'confirmed' | 'cancelled';

// Per-service booking status (on query_services). Distinct from the
// query-level BookingStatus (payment/check-in) defined above.
export type ServiceBookingStatus = 'pending' | 'payment_sent' | 'confirmed' | 'cancelled';

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
					booking_status: BookingStatus | null;
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
					// Intake (Phase C)
					passenger_id: string | null;
					created_by_staff: string | null;
					package_type: PackageType | null;
					duration_days: number | null;
					nights_makkah: number | null;
					nights_madinah: number | null;
					hotel_preference: string | null;
					client_preference: string | null;
					customer_plan: string | null;
					quick_note: string | null;
					responded: boolean | null;
					response_text: string | null;
					initial_quotation: string | null;
					stage_changed_at: string | null;
					voucher_sent_at: string | null;
					itinerary_cities: CityBlock[];
					trip_country: string | null;
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
					booking_status?: BookingStatus | null;
					assigned_to?: string | null;
					notes?: string | null;
					cost_price?: number;
					selling_price?: number;
					// Stage-action fields (written as a query moves through the pipeline).
					proposal_sent_date?: string | null;
					current_proposal_version?: number | null;
					finalized_date?: string | null;
					advance_payment_amount?: number | null;
					advance_payment_date?: string | null;
					completed_date?: string | null;
					customer_feedback?: string | null;
					// Intake (Phase C)
					passenger_id?: string | null;
					created_by_staff?: string | null;
					package_type?: PackageType | null;
					duration_days?: number | null;
					nights_makkah?: number | null;
					nights_madinah?: number | null;
					hotel_preference?: string | null;
					client_preference?: string | null;
					customer_plan?: string | null;
					quick_note?: string | null;
					responded?: boolean | null;
					response_text?: string | null;
					initial_quotation?: string | null;
					stage_changed_at?: string | null;
					voucher_sent_at?: string | null;
					itinerary_cities?: CityBlock[];
					trip_country?: string | null;
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
					whatsapp_group: string | null;
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
					whatsapp_number?: string | null;
					whatsapp_group?: string | null;
					address?: string | null;
					location?: string | null;
					country?: string | null;
					notes?: string | null;
					service_types?: string[];
					is_active?: boolean;
					is_deleted?: boolean;
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
					is_deleted: boolean;
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
					whatsapp?: string | null;
					cnic?: string | null;
					gender?: 'male' | 'female' | null;
					city?: string | null;
					country?: string;
					passport_number?: string | null;
					passport_expiry?: string | null;
					date_of_birth?: string | null;
					nationality?: string | null;
					notes?: string | null;
					status?: 'active' | 'inactive';
					is_deleted?: boolean;
				};
				Update: Partial<Database['public']['Tables']['passengers']['Insert']>;
				Relationships: [];
			};
			staff: {
				Row: {
					id: string;
					name: string;
					active: boolean;
					created_at: string;
				};
				Insert: { id?: string; name: string; active?: boolean };
				Update: Partial<Database['public']['Tables']['staff']['Insert']>;
				Relationships: [];
			};
			query_payments: {
				Row: {
					id: string;
					query_id: string;
					label: string;
					amount: number;
					due_date: string | null;
					status: 'pending' | 'paid';
					paid_date: string | null;
					method: string | null;
					reference: string | null;
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					query_id: string;
					label?: string;
					amount?: number;
					due_date?: string | null;
					status?: 'pending' | 'paid';
					paid_date?: string | null;
					method?: string | null;
					reference?: string | null;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['query_payments']['Insert']>;
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
					booking_status: ServiceBookingStatus;
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
					booking_status?: ServiceBookingStatus;
					service_date?: string | null;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['query_services']['Insert']>;
				Relationships: [];
			};
			rate_cards: {
				Row: {
					id: string;
					rate_date: string;
					item_type: RateItemType;
					name: string;
					city: string | null;
					vendor_id: string | null;
					currency: Currency;
					cost_price: number;
					selling_price: number;
					unit: string | null;
					occupancy: number | null;
					active: boolean;
					notes: string | null;
					meta: Record<string, unknown>;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					rate_date?: string;
					item_type: RateItemType;
					name: string;
					city?: string | null;
					vendor_id?: string | null;
					currency: Currency;
					cost_price?: number;
					selling_price?: number;
					unit?: string | null;
					occupancy?: number | null;
					active?: boolean;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['rate_cards']['Insert']>;
				Relationships: [];
			};
			exchange_rates: {
				Row: {
					id: string;
					rate_date: string;
					sar_to_pkr: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					rate_date?: string;
					sar_to_pkr: number;
				};
				Update: Partial<Database['public']['Tables']['exchange_rates']['Insert']>;
				Relationships: [];
			};
			quotations: {
				Row: {
					id: string;
					query_id: string;
					version: number;
					status: QuotationStatus;
					roe: number;
					adults: number;
					children: number;
					infants: number;
					sar_cost: number;
					sar_sell: number;
					tickets_cost_pkr: number;
					tickets_sell_pkr: number;
					total_cost_pkr: number;
					total_sell_pkr: number;
					profit_pkr: number;
					per_person_pkr: number;
					pp_include_infants: boolean;
					label: string | null;
					valid_until: string | null;
					inclusions: string[];
					exclusions: string[];
					whatsapp_text: string | null;
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					query_id: string;
					version?: number;
					status?: QuotationStatus;
					roe: number;
					adults?: number;
					children?: number;
					infants?: number;
					sar_cost?: number;
					sar_sell?: number;
					tickets_cost_pkr?: number;
					tickets_sell_pkr?: number;
					total_cost_pkr?: number;
					total_sell_pkr?: number;
					profit_pkr?: number;
					per_person_pkr?: number;
					pp_include_infants?: boolean;
					label?: string | null;
					valid_until?: string | null;
					inclusions?: string[];
					exclusions?: string[];
					whatsapp_text?: string | null;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['quotations']['Insert']>;
				Relationships: [];
			};
			quotation_lines: {
				Row: {
					id: string;
					quotation_id: string;
					line_type: QuotationLineType;
					label: string;
					rate_card_id: string | null;
					vendor_id: string | null;
					currency: Currency;
					unit_cost: number;
					unit_sell: number;
					quantity: number;
					line_cost: number;
					line_sell: number;
					meta: Record<string, unknown>;
					created_at: string;
				};
				Insert: {
					id?: string;
					quotation_id: string;
					line_type: QuotationLineType;
					label: string;
					rate_card_id?: string | null;
					vendor_id?: string | null;
					currency: Currency;
					unit_cost?: number;
					unit_sell?: number;
					quantity?: number;
					line_cost?: number;
					line_sell?: number;
					meta?: Record<string, unknown>;
				};
				Update: Partial<Database['public']['Tables']['quotation_lines']['Insert']>;
				Relationships: [];
			};
			bookings: {
				Row: {
					id: string;
					query_id: string;
					quotation_id: string | null;
					roe: number;
					quoted_cost_pkr: number;
					quoted_sell_pkr: number;
					actual_cost_pkr: number;
					actual_sell_pkr: number;
					profit_pkr: number;
					notes: string | null;
					is_deleted: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					query_id: string;
					quotation_id?: string | null;
					roe?: number;
					quoted_cost_pkr?: number;
					quoted_sell_pkr?: number;
					actual_cost_pkr?: number;
					actual_sell_pkr?: number;
					profit_pkr?: number;
					notes?: string | null;
					is_deleted?: boolean;
				};
				Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
				Relationships: [];
			};
			booking_items: {
				Row: {
					id: string;
					booking_id: string;
					line_type: QuotationLineType;
					label: string;
					vendor_id: string | null;
					currency: Currency;
					quoted_cost: number;
					quoted_sell: number;
					actual_cost: number;
					actual_sell: number;
					booking_reference: string | null;
					notes: string | null;
					meta: Record<string, unknown>;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					booking_id: string;
					line_type: QuotationLineType;
					label: string;
					vendor_id?: string | null;
					currency: Currency;
					quoted_cost?: number;
					quoted_sell?: number;
					actual_cost?: number;
					actual_sell?: number;
					booking_reference?: string | null;
					notes?: string | null;
					meta?: Record<string, unknown>;
				};
				Update: Partial<Database['public']['Tables']['booking_items']['Insert']>;
				Relationships: [];
			};
			documents: {
				Row: {
					id: string;
					entity_type: 'query' | 'passenger' | 'vendor' | 'invoice';
					entity_id: string;
					document_type: DocumentType;
					file_name: string;
					file_url: string;
					file_size: number | null;
					mime_type: string | null;
					expiry_date: string | null;
					uploaded_by: string | null;
					notes: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					entity_type: 'query' | 'passenger' | 'vendor' | 'invoice';
					entity_id: string;
					document_type: DocumentType;
					file_name: string;
					file_url: string;
					file_size?: number | null;
					mime_type?: string | null;
					expiry_date?: string | null;
					notes?: string | null;
				};
				Update: Partial<Database['public']['Tables']['documents']['Insert']>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
}
