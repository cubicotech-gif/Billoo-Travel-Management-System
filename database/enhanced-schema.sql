-- Enhanced Billoo Travel Management System - Supabase Schema
-- Run this AFTER the base schema.sql to add enhanced features

-- Add new columns to existing queries table
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) GENERATED ALWAYS AS (selling_price - cost_price) STORED;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5, 2) GENERATED ALWAYS AS (
  CASE WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price * 100) ELSE 0 END
) STORED;

-- Query Services table (for detailed service breakdown)
CREATE TABLE IF NOT EXISTS public.query_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID REFERENCES public.queries(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Flight', 'Hotel', 'Visa', 'Transport', 'Tour', 'Insurance', 'Other')),
  description TEXT NOT NULL,
  vendor TEXT NOT NULL,
  cost_price DECIMAL(10, 2) DEFAULT 0 CHECK (cost_price >= 0),
  selling_price DECIMAL(10, 2) DEFAULT 0 CHECK (selling_price >= 0),
  pnr TEXT,
  booking_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log table (for tracking all actions)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice', 'payment', 'document')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'email_sent', 'payment_received')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (for file attachments)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice')),
  entity_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'visa', 'ticket', 'voucher', 'invoice', 'receipt', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders table (for follow-ups and notifications)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'invoice', 'payment', 'document')),
  entity_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('follow_up', 'payment_due', 'document_expiry', 'travel_date', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT CHECK (category IN ('query', 'booking', 'payment', 'reminder', 'general')),
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication History table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger')),
  entity_id UUID NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'whatsapp', 'call', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  from_contact TEXT,
  to_contact TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new vendor columns
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;

-- Add invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.query_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  tax_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (tax_percentage >= 0),
  total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price * (1 + tax_percentage / 100)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_query_services_query_id ON public.query_services(query_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON public.reminders(is_completed, due_date);
CREATE INDEX IF NOT EXISTS idx_communications_entity ON public.communications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Updated_at triggers
CREATE TRIGGER update_query_services_updated_at BEFORE UPDATE ON public.query_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for new tables
ALTER TABLE public.query_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies (all authenticated users can access for now - refine based on roles later)
CREATE POLICY "All authenticated users can view query services" ON public.query_services
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert query services" ON public.query_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update query services" ON public.query_services
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view activities" ON public.activities
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view documents" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update documents" ON public.documents
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete documents" ON public.documents
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view email templates" ON public.email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view communications" ON public.communications
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert communications" ON public.communications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view invoice items" ON public.invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert invoice items" ON public.invoice_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Sample email templates
INSERT INTO public.email_templates (name, subject, body, category, variables) VALUES
('query_confirmation', 'Query Received - {{query_number}}',
'Dear {{client_name}},\n\nThank you for your inquiry regarding {{destination}}.\n\nYour query number is: {{query_number}}\n\nWe will get back to you shortly with the best options.\n\nBest regards,\nBilloo Travel',
'query', '{"client_name", "destination", "query_number"}'::jsonb),

('quotation', 'Quotation for your trip to {{destination}}',
'Dear {{client_name}},\n\nPlease find below the quotation for your trip to {{destination}}:\n\nTotal Amount: ₹{{amount}}\n\nThis quotation is valid for 7 days.\n\nBest regards,\nBilloo Travel',
'query', '{"client_name", "destination", "amount"}'::jsonb),

('booking_confirmation', 'Booking Confirmed - {{query_number}}',
'Dear {{client_name}},\n\nYour booking has been confirmed!\n\nBooking Reference: {{query_number}}\nDestination: {{destination}}\nTravel Date: {{travel_date}}\n\nWe will send you the tickets and vouchers shortly.\n\nBest regards,\nBilloo Travel',
'booking', '{"client_name", "query_number", "destination", "travel_date"}'::jsonb),

('payment_reminder', 'Payment Reminder - {{invoice_number}}',
'Dear {{client_name}},\n\nThis is a friendly reminder that payment for invoice {{invoice_number}} is due on {{due_date}}.\n\nAmount Due: ₹{{amount}}\n\nPlease make the payment at your earliest convenience.\n\nBest regards,\nBilloo Travel',
'payment', '{"client_name", "invoice_number", "due_date", "amount"}'::jsonb)

ON CONFLICT (name) DO NOTHING;
