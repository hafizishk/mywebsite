# /admin — Stackform HQ

Owner-only business dashboard at `stackformstudios.com/admin`: invoices,
pipeline, clients, subscriptions, projects, Cass's task list, and a small
YouTube playlist player.

Static page like the rest of the site. Data lives in a dedicated Supabase
project; every table is locked by row-level security to one email
(`hafiz@stackformstudios.com`), so the code can be public but the numbers
cannot be read without signing in as that email.

## One-time setup

1. Create a new Supabase project (region: Singapore). Do not reuse a client's.
2. SQL editor → run `supabase/admin_schema.sql`, then `supabase/admin_seed.sql`.
3. Authentication → Providers → Email: on. Turn **off** "Allow new users to sign up".
4. Authentication → Users → Add user → `hafiz@stackformstudios.com`.
5. Authentication → URL configuration: Site URL `https://www.stackformstudios.com`,
   redirect URLs add `https://www.stackformstudios.com/admin` (and the Vercel
   preview URL while testing).
6. Project settings → API: copy the Project URL and the `anon` public key into
   `admin/config.js`. Never use the `service_role` key here.

Sign in by email link. Records are added and edited in the page (tap any row).
