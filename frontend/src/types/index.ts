export interface Query {
  id: number;
  query_number: string;
  passenger_name: string;
  phone: string;
  email: string;
  travel_type: 'Umrah' | 'Malaysia' | 'Flight' | 'Hotel' | 'Other';
  status: 'New' | 'Working' | 'Quoted' | 'Finalized' | 'Cancelled';
  created_by: number;
  created_at: string;
  creator_name?: string;
}

export interface DashboardStats {
  totalQueries: number;
  queriesToday: number;
  queriesThisWeek: number;
  statusStats: { status: string; count: number }[];
  recentQueries: Query[];
}
