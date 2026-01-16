-- Enable the pg_trgm extension for fuzzy search (must be first)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create enum for platform (if not exists)
DO $$ BEGIN
  CREATE TYPE public.platform_type AS ENUM ('windows', 'mac', 'linux');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for status (if not exists)
DO $$ BEGIN
  CREATE TYPE public.user_flow_status AS ENUM ('INIT', 'ANALYZED', 'SUPERSEDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_flows table
CREATE TABLE public.user_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  flow_name TEXT NOT NULL,
  flow_description TEXT,
  client_version TEXT,
  platform platform_type NOT NULL DEFAULT 'windows',
  package_hash TEXT,
  package_size BIGINT,
  package_url TEXT,
  status user_flow_status NOT NULL DEFAULT 'INIT',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on flow_id + user_id
CREATE UNIQUE INDEX idx_user_flows_flow_user ON public.user_flows(flow_id, user_id);

-- Create index for searching
CREATE INDEX idx_user_flows_flow_id ON public.user_flows(flow_id);
CREATE INDEX idx_user_flows_flow_name ON public.user_flows USING gin(flow_name gin_trgm_ops);

-- Enable Row Level Security
ALTER TABLE public.user_flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage user_flows"
ON public.user_flows
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view user_flows"
ON public.user_flows
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_flows_updated_at
BEFORE UPDATE ON public.user_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();