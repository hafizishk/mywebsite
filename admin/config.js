// Stackform admin — Supabase connection.
// The anon key is designed to be public: every table is locked by row-level
// security to the owner's email (see supabase/admin_schema.sql).
// NEVER put the service_role key here.
window.STACKFORM_ADMIN = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY',
  ownerEmail: 'hafiz@stackformstudios.com',
};
