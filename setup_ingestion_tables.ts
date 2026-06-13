
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupTables() {
  const sql = `
    -- Discovered Channels Table
    CREATE TABLE IF NOT EXISTS public.discovered_channels (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      category TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'stable', 'failed')),
      fail_count INTEGER DEFAULT 0,
      last_check TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Stable Channels Table
    CREATE TABLE IF NOT EXISTS public.stable_channels (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      thumbnail TEXT,
      url TEXT NOT NULL UNIQUE,
      icon TEXT,
      description TEXT,
      country TEXT,
      language TEXT,
      stream_type TEXT,
      backup_urls TEXT[] DEFAULT '{}',
      epg_id TEXT,
      is_active BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      order_index INTEGER DEFAULT 0,
      last_verified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Enable RLS
    ALTER TABLE public.discovered_channels ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.stable_channels ENABLE ROW LEVEL SECURITY;

    -- Add Policies (if they don't exist)
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage discovered_channels') THEN
        CREATE POLICY "Admin can manage discovered_channels" ON public.discovered_channels FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view discovered_channels status') THEN
        CREATE POLICY "Public can view discovered_channels status" ON public.discovered_channels FOR SELECT USING (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage stable_channels') THEN
        CREATE POLICY "Admin can manage stable_channels" ON public.stable_channels FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view stable_channels') THEN
        CREATE POLICY "Public can view stable_channels" ON public.stable_channels FOR SELECT USING (true);
      END IF;
    END $$;
  `;

  // Note: supabase-js doesn't have a direct 'sql' method for raw SQL unless it's an RPC.
  // In many AI Studio environments, we can use a custom RPC or just run it via npx tsx and a helper if available.
  // Since we don't have a pre-existing RPC for raw SQL, this script might fail if we don't have one.
  // I will try to use the 'rpc' method if a 'exec_sql' function exists, or I will use the setup.sql approach if available.
  
  console.log("Attempting to create tables via RPC...");
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error creating tables:', error);
    console.log('Falling back to manual instruction: Please run the SQL in your Supabase SQL Editor.');
  } else {
    console.log('Tables created successfully!');
  }
}

setupTables();
