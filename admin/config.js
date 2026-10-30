// Stackform admin — Supabase connection.
// The anon key is designed to be public: every table is locked by row-level
// security to the owner's email (see supabase/admin_schema.sql).
// NEVER put the service_role key here.
window.STACKFORM_ADMIN = {
  supabaseUrl: 'https://hbszbkmfhgyhizholynu.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic3pia21maGd5aGl6aG9seW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzQ3ODIsImV4cCI6MjEwODkxMDc4Mn0.LvVoHtSzTrQUR_dzaVIwOrCXEKnP2_AjwbdxCltnR-k',
  ownerEmail: 'hafiz@stackformstudios.com',
};
