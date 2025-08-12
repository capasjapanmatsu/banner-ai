import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured } from '@/lib/env';

const supabaseUrl = ENV.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { isSupabaseConfigured };
