# Vinyl DB

A Next.js application for managing vinyl records, built with Supabase and TypeScript.

### Prerequisites

- Node.js (Latest LTS version recommended)
- PostgreSQL 15
- Supabase CLI
- Yarn package manager



### Tech Stack
- Next.js 14
- TypeScript
- Supabase (Auth, Database)
- Tailwind CSS
- ESLint + Prettier


### Dev Docs & More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)    

## Getting Started

1. Install dependencies:
```bash
yarn install
```

2. Set up Supabase locally:
```bash
# Install Supabase CLI if you haven't already
brew install supabase/tap/supabase

# Link to your Supabase project
supabase link --project-ref <project-id>

# Start the local Supabase instance
supabase start

# Pull seed data from your remote database
supabase db dump --data-only -f supabase/seed.sql

# Apply seed data to local database
supabase db reset

```

3. Set up your environment variables:
Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the development server:
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

### Code Quality
- Format code: `yarn format`
- Lint code: `yarn lint`

### Database Management

#### Migrations
To create a new migration:
```bash
supabase migration new your_migration_name
```

To apply migrations:
```bash
supabase db reset
```
