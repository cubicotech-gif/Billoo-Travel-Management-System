import type { Database } from '$lib/database.types';

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingItem = Database['public']['Tables']['booking_items']['Row'];
export type BookingItemUpdate = Database['public']['Tables']['booking_items']['Update'];
