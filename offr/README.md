# offr — UCAS offer prediction for IB & A-Level students

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + CSS custom properties (design system in `globals.css`)
- **Auth + DB**: Supabase (Google OAuth + Postgres + RLS)
- **Backend**: FastAPI Python (`api/index.py`) on Vercel serverless
- **AI**: Google Gemini (`gemini-1.5-flash`) for PS analysis

## Setup

### 1. Clone & install
```bash
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

### 3. Supabase
- Run `supabase-schema.sql` in your Supabase SQL editor
- Enable Google OAuth in Supabase → Authentication → Providers → Google
- Add your Vercel domain to Supabase → Authentication → URL Configuration

### 4. Google Cloud
- Create OAuth 2.0 credentials
- Add `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback` to Authorized redirect URIs
- Add your Vercel domain to Authorized JavaScript origins

### 5. Deploy
Push to GitHub, connect to Vercel. Set environment variables in Vercel dashboard.

### 6. PS Analyser backend
Add the route from `api/ps_route_addition.py` to your `api/index.py`.

## Pages
| Route | Description |
|---|---|
| `/` | Landing with persona intent entry |
| `/auth` | Google sign-in |
| `/onboarding` | 6-step profile builder with persona selection |
| `/dashboard` | Home hub with persona quick actions |
| `/dashboard/explore` | Course discovery + hidden gems |
| `/dashboard/strategy` | Optimizer: mix analysis, PS tips, alternatives |
| `/dashboard/assess` | Direct offer chance prediction |
| `/dashboard/result` | Explainable result with full breakdown |
| `/dashboard/tracker` | 5-choice UCAS planner with labels |
| `/dashboard/ps` | Line-by-line PS analyser |
| `/dashboard/profile` | Edit grades, interests, PS |
| `/dashboard/faq` | Categorised FAQ |

## Design system
All design tokens are in `app/globals.css` as CSS custom properties.
Key utility classes: `.card`, `.inp`, `.btn`, `.btn-prim`, `.btn-ghost`, `.pill`, `.pill-safe`, `.pill-target`, `.pill-reach`, `.label`, `.serif`, `.glass-dark`, `.glass-parch`
