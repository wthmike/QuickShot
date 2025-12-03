import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://alctqrtixtcmtcynctjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY3RxcnRpeHRjbXRjeW5jdGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDUxNzgsImV4cCI6MjA4MDI4MTE3OH0.7U3Og_PNufX4bi5Vz-_dGPHT_ukkTh-rDxGA_NzpRTk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
