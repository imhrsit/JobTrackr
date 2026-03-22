# JobTrackr

A full-stack job application tracker built with Next.js 16, React 19, Prisma and PostgreSQL.

Track every stage of your job search from saved postings through offers with a Kanban board, referral tracking, interview scheduling and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (credentials + JWT) |
| Styling | Tailwind CSS 4 |
| State | TanStack React Query 5 |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| UI Components | Radix UI + shadcn/ui |
| Validation | Zod |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm / npm / yarn / bun

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd jobtrackr
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
# PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/jobtrackr"

# NextAuth — use a strong random string in production
# Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3. Set up the database

```bash
# Push schema to database (development)
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate

# Seed with demo data
npm run db:seed
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Full URL of the app (e.g. `https://yourapp.com`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `NODE_ENV` | No | `development` \| `production` |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Sync schema without migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with demo data |

---

## Project Structure

```
app/
  (auth)/          # Login and signup pages
  (dashboard)/     # All authenticated app pages
    dashboard/     # Overview stats and charts
    applications/  # Kanban board
    analytics/     # Application funnel analytics
    jobs/[jobId]/  # Job detail page with tabs
    profile/       # User profile and settings
  api/             # API routes
components/
  applications/    # Kanban board, card, detail tabs
  analytics/       # Chart components
  layout/          # Sidebar, header, mobile nav
  ui/              # shadcn/ui base components + skeletons
lib/               # Prisma client, auth, utilities
prisma/
  schema.prisma    # Database schema
  migrations/      # Migration history
  seed.ts          # Demo seed data
```

---

## Features

- **Kanban board** — Drag applications across SAVED → APPLIED → REFERRED → INTERVIEWING → OFFERED → REJECTED
- **Referral tracking** — Track referral requests and status per application
- **Interview scheduling** — Log upcoming and past interviews with types and notes
- **Skills matching** — Tag skills per job and track proficiency
- **Analytics** — Application funnel, status distribution, applications over time
- **Activity log** — Automatic audit trail of status changes and updates
- **Document notes** — Cover letter and resume version tracking
- **Dark mode** — System-aware theme switching
- **Keyboard accessible** — Full keyboard navigation and screen reader support
