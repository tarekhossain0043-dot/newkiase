# NEXORA Supabase setup

## 1. Create a Supabase project
Create a project at https://supabase.com/dashboard. Choose a strong database password and keep it private.

## 2. Apply the database schema
Open **SQL Editor** in the project dashboard and run the complete migration in:
`supabase/migrations/202610290001_nexora_store.sql`

The migration creates the catalogue, profiles/roles, orders, order items, payment verification, inventory history, coupons, banners, and site settings with Row Level Security (RLS).

## 3. Configure environment variables
Copy `.env.example` to `.env.local` for local development and set the values from **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key supported by your project)

Add the same two values in **Vercel → Project → Settings → Environment Variables**, then redeploy.

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or expose it to browser code. The current server routes use the user's session plus RLS; no service-role key is required.

## 4. Create your admin account
1. In Supabase **Authentication → Users**, create the admin user (or sign up through a future customer auth page).
2. Copy that user's UUID.
3. In SQL Editor, run this query with the real admin email:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
   ```
4. Sign in at `/admin/login`. Admin pages and admin APIs check the verified Supabase user and the profile role on the server.

Do not allow public sign-up to choose their own role. New users default to `customer`.

## 5. Storage
Create a private bucket named `product-images` for uploads and configure storage policies so only admins can upload/update/delete. Public product images can be delivered through a public read policy/bucket if you intend catalogue images to be public. Do not upload payment screenshots containing unnecessary personal information.

## Current implementation scope
- Schema and RLS migration.
- Supabase SSR browser/server clients.
- Admin route protection middleware and admin guard.
- Server APIs for product CRUD/archive and order/payment-status management.
- Server-side checkout API that re-reads product prices and stock and calculates totals.

The existing storefront and admin dashboard still need their UI data flows migrated from demo/local state to these APIs. Until the Supabase project is created, the schema applied, and environment variables configured, the live store is not database-backed. Do not accept real orders yet.
