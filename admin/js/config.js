const SUPABASE_URL = 'https://coksmhsdiidaionazfvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNva3NtaHNkaWlkYWlvbmF6ZnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0ODkwNjAsImV4cCI6MjA2MzA2NTA2MH0.HME4kxY-t9vmmPDuPykG1trNINM_x1wsQ5EGD7YvxvQ';

// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { supabaseClient }; 