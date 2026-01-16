-- Add workflow package fields to workflows table
ALTER TABLE public.workflows 
ADD COLUMN package_path text,
ADD COLUMN package_size bigint,
ADD COLUMN package_name text;