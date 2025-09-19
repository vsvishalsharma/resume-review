<div align="center">

# Resume Review Platform

End-to-end resume submission and review workflow built with Next.js (App Router), Supabase Auth/Storage/Postgres (with RLS), Tailwind CSS, and TypeScript.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

</div>

## Overview

The Resume Review Platform lets users sign in via magic link, upload PDF resumes (up to 10MB), and track review status. Admins can view all submissions, score resumes, add notes, and approve/reject or request revisions. Files are stored in a private Supabase Storage bucket with signed URLs; database access is protected using Postgres Row-Level Security (RLS).

Key entry points:
- `app/page.tsx` dynamically loads the client-only app shell.
- `app/hooks/useAuth.tsx` manages auth state, session, and user `profiles` lookup.
- `app/components/ResumeUpload.tsx` handles PDF upload to Storage and creates a `resumes` row.
- `app/components/ResumeDashboard.tsx` shows a user's submissions and statuses.
- `app/components/AdminPanel.tsx` admin-only panel to list and review all resumes.
- Supabase schema and policies live in `supabase/migrations/`.

## Features

- Authentication with passwordless magic links (Supabase Auth)
- Secure file uploads to a private `resumes` Storage bucket
- Resume review workflow with statuses: `pending`, `approved`, `needs_revision`, `rejected`
- Optional scoring (0–100) and admin notes
- User dashboard to track submissions and download original files
- Admin panel with search-like list of all resumes and actions
- RLS-secured Postgres tables and Storage policies

## Architecture

- Frontend: Next.js App Router + React 19 + Tailwind CSS
- Backend: Supabase (Postgres, Auth, Storage)
- Client SDK: `@supabase/supabase-js` used in `app/integrations/supabase/client.ts`
- Database objects and RLS: `supabase/migrations/*.sql`

## Tech Stack

- Next.js 15, React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase (Auth, Postgres, Storage)
- ESLint 9

## Prerequisites

- Node.js 18+ and npm (or pnpm/yarn/bun)
- A Supabase project with:
  - Auth enabled (email magic links)
  - Storage enabled
  - SQL access to run the migrations in `supabase/migrations/`

## Environment Variables

Create `.env` at the project root with the following keys. In production, configure these in your hosting provider (e.g., Vercel) as environment variables.

```bash
# Required (recommended)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (used by Supabase Auth email redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Important:
- The current client initializes Supabase in `app/integrations/supabase/client.ts`. For security and portability, move the hardcoded URL/key into env vars as above and read them at runtime.
- Never commit secrets to version control. Use project-level environment configuration.

## Database & Storage Setup

1) Run migrations in order (via the Supabase SQL Editor or CLI):

- `supabase/migrations/20250917152151_*.sql` creates tables:
  - `public.profiles` (with `is_admin`), auto-created on signup via trigger
  - `public.resumes` with status enum, score, notes, reviewer info
  - RLS policies for users and admins
  - Storage bucket `resumes` (private) and Storage policies

- `supabase/migrations/20250918210425_fix_rls_is_admin.sql` fixes recursive RLS by introducing a `public.is_admin(uuid)` helper and updates policies.

2) Storage bucket

- The migration inserts a private bucket named `resumes` and policies for per-user access and admin access.

3) Grant admin privileges

- Mark a user as admin by setting `profiles.is_admin = true` for their `user_id`:

```sql
update public.profiles set is_admin = true where user_id = '00000000-0000-0000-0000-000000000000';
```

## Local Development

Install dependencies:

```bash
npm install
```

Ensure `.env` is configured, then run the dev server:

```bash
npm run dev
```

Open http://localhost:3000

Available scripts:

```bash
npm run dev      # start next dev server
npm run build    # production build
npm run start    # run built app
npm run lint     # lint the project
```

## Usage

- Sign in with your email to receive a magic link.
- Upload a PDF resume (max 10MB) on the main screen. Uploads go to `resumes/<user_id>/<timestamp>.pdf`.
- Track status and notes in the "My Resumes" dashboard.
- Admins can open the Admin Panel to view all submissions, set status/score, add notes, and download/view files.

## Directory Structure (selected)

```
app/
  components/
    AdminPanel.tsx           # Admin review UI
    ResumeDashboard.tsx      # User dashboard
    ResumeUpload.tsx         # Upload UI and storage insert
    ui/                      # Reusable UI primitives
  hooks/
    useAuth.tsx              # Auth provider and profile fetch
  integrations/
    supabase/
      client.ts              # Supabase client init (move keys to env)
      types.ts               # Generated DB types
  lib/
    utils.ts                 # Utility helpers
supabase/
  migrations/                # SQL migrations (tables, RLS, storage)
```

## Deployment

Recommended: Vercel

1) Set environment variables in the Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optionally `NEXT_PUBLIC_SITE_URL`

2) Build and deploy

- Vercel will run `npm run build` using Node 18+.

3) Supabase

- Make sure your production Supabase project has the same schema and policies (run the migrations against production).

## Security Notes

- Keep the Supabase anon key public-but-rotatable; do not expose service role keys to the client.
- Enforce RLS for all tables with client access (already configured in migrations).
- Signed URLs are used for viewing files; the bucket is private by default.
- Consider rate-limiting or validations on uploads if needed.

## Troubleshooting

- Magic link loop or no session?
  - Ensure the Site URL and Redirect URLs in Supabase Auth settings include your local/prod domain.
  - Check `emailRedirectTo` in `useAuth.tsx` uses `window.location.origin`.

- 401/403 from Storage or tables?
  - Verify RLS policies and that the authenticated user’s `profiles` row exists.
  - For admin actions, confirm `profiles.is_admin = true` for that user.

- Cannot view PDFs in a new tab
  - Ensure signed URLs are generated (`AdminPanel.tsx` uses `createSignedUrl`).

## License

This project is licensed under the MIT License. See LICENSE file if added.

---

Scaffold notes (from the original Next.js template) are intentionally omitted from this README to keep it concise and production-focused. Refer to Next.js docs if you are new to the framework: https://nextjs.org/docs
