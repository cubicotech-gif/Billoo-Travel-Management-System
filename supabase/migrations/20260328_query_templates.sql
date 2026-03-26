-- Phase Q5: Query Templates table
CREATE TABLE IF NOT EXISTS public.query_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  duration_days INTEGER,
  services_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  pax_type TEXT DEFAULT 'per_person' CHECK (pax_type IN ('per_person', 'per_group', 'fixed')),
  base_pax_count INTEGER DEFAULT 1,
  category TEXT CHECK (category IN ('umrah_economy', 'umrah_standard', 'umrah_premium', 'hajj', 'leisure', 'visa_only', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_templates_category ON public.query_templates(category);
CREATE INDEX IF NOT EXISTS idx_query_templates_active ON public.query_templates(is_active);

ALTER TABLE public.query_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage query templates" ON public.query_templates
  FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_query_templates_updated_at ON public.query_templates;
CREATE TRIGGER update_query_templates_updated_at
  BEFORE UPDATE ON public.query_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
