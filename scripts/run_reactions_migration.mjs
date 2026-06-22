import fetch from 'node:fetch';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const cleanedLine = line.trim();
      if (!cleanedLine || cleanedLine.startsWith('#')) return;
      const match = cleanedLine.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('Failed to load .env.local:', e.message);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  return { status: res.status, body: await res.text() };
}

async function checkColumn() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=reactions&limit=1`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  return res.status;
}

async function main() {
  console.log('🔍 Checking if reactions column exists...');
  const status = await checkColumn();
  
  if (status === 200) {
    console.log('✅ reactions column already exists! Reactions will persist correctly.');
    return;
  }
  
  console.log('❌ reactions column missing (HTTP', status, '). Attempting to add it...');
  
  // Try via rpc exec_sql if function exists
  const result = await runSQL("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb; CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);");
  console.log('RPC response:', result.status, result.body);
  
  if (result.status === 200 || result.status === 204) {
    console.log('✅ Migration successful! Reactions will now persist.');
  } else {
    console.log('\n⚠️  Could not auto-migrate. Please run this SQL manually in Supabase Dashboard:');
    console.log('   URL: https://supabase.com/dashboard/project/vbgqcdosupkdlwopvgff/sql/new');
    console.log('\n   SQL to run:');
    console.log("   ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;");
    console.log("   CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);");
  }
}

main().catch(console.error);
