// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://coksmhsdiidaionazfvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNva3NtaHNkaWlkYWlvbmF6ZnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0ODkwNjAsImV4cCI6MjA2MzA2NTA2MH0.HME4kxY-t9vmmPDuPykG1trNINM_x1wsQ5EGD7YvxvQ';

export const supabase = createClient(supabaseUrl, supabaseKey); 