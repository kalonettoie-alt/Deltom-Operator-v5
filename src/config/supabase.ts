import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://mypddwxgcmyyvdhesjdf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cGRkd3hnY215eXZkaGVzamRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODU2MzQsImV4cCI6MjA4MDM2MTYzNH0.3J2pzFMOs-eUrcsj8SqlC2QM-hRByzYIvz-E7bJGBt4';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
