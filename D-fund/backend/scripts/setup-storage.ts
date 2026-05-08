/**
 * Script de setup Supabase Storage
 * Crée les buckets nécessaires s'ils n'existent pas déjà.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS: { name: string; public: boolean }[] = [
  { name: 'images',      public: true  },
  { name: 'avatars',     public: true  },
  { name: 'covers',      public: true  },
  { name: 'attachments', public: false },
];

async function main() {
  console.log('🔧  Setup Supabase Storage...\n');

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('❌  Impossible de lister les buckets :', listError.message);
    process.exit(1);
  }

  const existingNames = new Set(existing.map((b) => b.name));

  for (const bucket of BUCKETS) {
    if (existingNames.has(bucket.name)) {
      console.log(`✅  Bucket "${bucket.name}" existe déjà — ignoré`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
    });

    if (error) {
      console.error(`❌  Erreur création "${bucket.name}" :`, error.message);
    } else {
      console.log(`✅  Bucket "${bucket.name}" créé (public: ${bucket.public})`);
    }
  }

  console.log('\n🎉  Storage configuré. Tu peux uploader des fichiers.');
}

main();
