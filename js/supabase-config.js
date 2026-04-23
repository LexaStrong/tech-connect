// Supabase Configuration
const SUPABASE_URL = 'https://stzcrnkxkztuoeuhlzdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0emNybmt4a3p0dW9ldWhsemR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTIyMDAsImV4cCI6MjA5MjQ2ODIwMH0.whe4y_7LL90tANUEscF2RMSqB38VhOGCtzm6AuAShXE';

// Initialize the Supabase client
// This expects the Supabase UMD bundle to be loaded from CDN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make it available globally
window.supabaseClient = supabase;
