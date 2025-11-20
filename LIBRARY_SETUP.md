# Library/SEE Module Setup Instructions

## Step 1: Create Supabase Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Name: `documents`
5. Make it **Public** (or configure RLS as needed)
6. Click **Create bucket**

## Step 2: Create Documents Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Creates documents table for Library/SEE feature
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- add foreign key to users later
  title text,
  filename text not null,
  category text not null check (category in ('playbook', 'corpus')) default 'corpus',
  mime_type text not null,
  storage_path text not null, -- path in Supabase Storage bucket
  size_bytes integer,
  lesson_id text, -- links to lessons table if applicable
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  embedded boolean default false -- tracks if embeddings are created
);

-- Indexes for filtering and ordering
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_category_idx on public.documents(category);
create index if not exists documents_lesson_id_idx on public.documents(lesson_id);
create index if not exists documents_created_at_idx on public.documents(created_at);

-- Disable RLS for now (add auth later)
alter table documents disable row level security;
```

## Step 3: Verify Environment Variables

Ensure these are set in `.env.local` and Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## How It Works

1. **Upload Flow**: When users upload files via `/agent`, files are now:
   - Stored in Supabase Storage (`documents` bucket)
   - Metadata saved to `documents` table
   - Embedded into Pinecone (existing behavior)
   - Saved to `lessons` table (existing behavior)

2. **Library View**: Users can:
   - View all uploaded documents in `/library`
   - Filter by Playbook vs Corpus
   - Search by filename/title
   - View individual documents
   - Reclassify documents (Playbook ↔ Corpus)
   - Delete documents

3. **Category Logic**:
   - Files uploaded with `source: "playbook"` → `category: "playbook"`
   - All other files → `category: "corpus"`

## Notes

- The `user_id` field is currently a placeholder UUID. Replace with actual auth when implementing user authentication.
- Files are stored with signed URLs (1 hour expiry) for security.
- Document deletion removes both the file from storage and the metadata from the database.

