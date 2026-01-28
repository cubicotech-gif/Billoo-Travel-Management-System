import { supabase } from '../supabase';

export interface BookingConfirmationData {
  confirmationNumber: string;
  voucherFile: File | null;
  notes?: string;
}

export interface VendorTransactionData {
  vendor_id: string;
  query_id: string;
  service_id: string;
  service_description: string;
  service_type: string;
  city?: string;
  currency: string;
  exchange_rate_to_pkr: number;
  purchase_amount_original: number;
  purchase_amount_pkr: number;
  selling_amount_original: number;
  selling_amount_pkr: number;
  booking_reference?: string;
}

/**
 * Upload voucher file to Supabase Storage
 */
export async function uploadVoucher(file: File, serviceId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${serviceId}_${Date.now()}.${fileExt}`;
  const filePath = `booking-vouchers/${fileName}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('booking-vouchers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading voucher:', error);
    throw new Error('Failed to upload voucher file');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('booking-vouchers')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Confirm booking with optional voucher upload
 */
export async function confirmBooking(
  serviceId: string,
  queryId: string,
  confirmationData: BookingConfirmationData
): Promise<void> {
  let voucherUrl = null;

  // Upload voucher if provided
  if (confirmationData.voucherFile) {
    voucherUrl = await uploadVoucher(confirmationData.voucherFile, serviceId);
  }

  // Update service booking status
  const { error: serviceError } = await supabase
    .from('query_services')
    .update({
      booking_status: 'confirmed',
      booked_date: new Date().toISOString(),
      booking_confirmation: confirmationData.confirmationNumber,
      voucher_url: voucherUrl,
      booking_notes: confirmationData.notes || null
    })
    .eq('id', serviceId);

  if (serviceError) {
    console.error('Error updating service:', serviceError);
    throw new Error('Failed to confirm booking');
  }

  // Check if all services are confirmed
  const { data: allServices, error: servicesError } = await supabase
    .from('query_services')
    .select('booking_status')
    .eq('query_id', queryId);

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
    // Don't throw - booking was successful even if status update fails
    return;
  }

  // If all services are confirmed, update query status
  const allConfirmed = allServices?.every(s => s.booking_status === 'confirmed');

  if (allConfirmed) {
    await supabase
      .from('queries')
      .update({ status: 'Services Booked' })
      .eq('id', queryId);
  }
}

/**
 * Skip vendor payment for a service
 */
export async function skipVendorPayment(
  serviceId: string,
  reason: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('query_services')
    .update({
      payment_skipped: true,
      skip_payment_reason: reason,
      booking_notes: notes || null,
      booking_status: 'payment_sent'
    })
    .eq('id', serviceId);

  if (error) {
    console.error('Error skipping payment:', error);
    throw new Error('Failed to skip payment');
  }
}

/**
 * Get or create vendor transaction for a service
 */
export async function getOrCreateVendorTransaction(
  serviceId: string
): Promise<any> {
  // First, check if transaction already exists
  const { data: existingTx } = await supabase
    .from('vendor_transactions')
    .select('*')
    .eq('service_id', serviceId)
    .single();

  if (existingTx) {
    return existingTx;
  }

  // If no transaction exists, get service details and create one
  const { data: service, error: serviceError } = await supabase
    .from('query_services')
    .select(`
      *,
      queries (
        id,
        query_number
      )
    `)
    .eq('id', serviceId)
    .single();

  if (serviceError || !service) {
    console.error('Error fetching service:', serviceError);
    throw new Error('Service not found');
  }

  // Check if vendor is assigned
  if (!service.vendor_id) {
    throw new Error('Please assign a vendor to this service first');
  }

  // Get vendor details
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', service.vendor_id)
    .single();

  if (vendorError || !vendor) {
    console.error('Error fetching vendor:', vendorError);
    throw new Error('Vendor not found');
  }

  // Create transaction
  const transactionData: VendorTransactionData = {
    vendor_id: service.vendor_id,
    query_id: service.query_id,
    service_id: service.id,
    service_description: service.service_description,
    service_type: service.service_type,
    city: service.city,
    currency: service.currency || 'PKR',
    exchange_rate_to_pkr: service.exchange_rate || 1.0,
    purchase_amount_original: service.purchase_price,
    purchase_amount_pkr: service.purchase_price * (service.exchange_rate || 1.0),
    selling_amount_original: service.selling_price,
    selling_amount_pkr: service.selling_price * (service.exchange_rate || 1.0),
    booking_reference: service.booking_confirmation
  };

  const { data: transaction, error: createError } = await supabase
    .from('vendor_transactions')
    .insert({
      ...transactionData,
      transaction_date: new Date().toISOString(),
      payment_status: 'PENDING',
      amount_paid: 0
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating transaction:', createError);
    throw new Error('Failed to create vendor transaction');
  }

  return transaction;
}

/**
 * Update service booking status to payment_sent
 */
export async function markPaymentSent(serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('query_services')
    .update({
      booking_status: 'payment_sent'
    })
    .eq('id', serviceId);

  if (error) {
    console.error('Error updating service:', error);
    throw new Error('Failed to update service status');
  }
}

/**
 * Get all vendor transactions for a query
 */
export async function getQueryVendorTransactions(queryId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('vendor_transactions')
    .select(`
      *,
      vendors (
        id,
        name,
        type
      )
    `)
    .eq('query_id', queryId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch vendor transactions');
  }

  return data || [];
}

/**
 * Get booking documents for a query
 */
export async function getBookingDocuments(queryId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('query_services')
    .select('id, service_description, booking_confirmation, voucher_url, booked_date')
    .eq('query_id', queryId)
    .not('voucher_url', 'is', null)
    .order('booked_date', { ascending: false });

  if (error) {
    console.error('Error fetching booking documents:', error);
    throw new Error('Failed to fetch booking documents');
  }

  return data || [];
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  serviceId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('query_services')
    .update({
      booking_status: 'cancelled',
      booking_notes: reason
    })
    .eq('id', serviceId);

  if (error) {
    console.error('Error cancelling booking:', error);
    throw new Error('Failed to cancel booking');
  }
}
