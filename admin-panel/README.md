CoreUI admin panel built with Next.js, NextAuth, and RTK Query.

## Getting Started

1. Create env file:

```bash
cp .env.example .env.local
```

2. Run development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `NEXT_PUBLIC_API_URL` backend base URL (default `http://localhost:5000/api`)
- `NEXTAUTH_URL` frontend URL (for auth callback/session)
- `NEXTAUTH_SECRET` random secret for session JWT signing

## Auth Flow

- Login uses NextAuth Credentials provider calling backend `/admin/auth/login`
- Access token is stored in NextAuth session JWT
- Users screen consumes backend `/admin/users` via RTK Query

## Seeder (Backend)

Run from `backend`:

```bash
npm run seed:super-admin
```

Required backend env vars for seeder:

- `MONGO_URI`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- optional `SUPER_ADMIN_NAME`
