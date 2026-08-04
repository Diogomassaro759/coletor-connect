// Server-side environment variable validation
// Called at boot to ensure all required Supabase variables are present

const REQUIRED_ENV_VARS = {
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_PUBLISHABLE_KEY: 'Supabase public/anon key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role secret key',
} as const;

export function validateServerEnv() {
  const missing: string[] = [];

  for (const [key] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const list = missing.join('\n  - ');
    const help = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Missing Supabase environment variables

Required variables not found:
  - ${list}

📋 To fix this:

1. Create a .env file in the project root with these variables:
   ${missing.map(key => `${key}=<value>`).join('\n   ')}

2. Get the values from your Supabase dashboard:
   → Go to Settings → API
   → Copy "Project URL" → SUPABASE_URL
   → Copy "anon public" key → SUPABASE_PUBLISHABLE_KEY
   → Copy "service_role secret" key → SUPABASE_SERVICE_ROLE_KEY

3. Restart the dev server: bun run dev

⚠️  SECURITY WARNING:
   - Never commit .env to version control
   - Never expose SUPABASE_SERVICE_ROLE_KEY to the browser
   - Never share these keys publicly

See .env.example for a template.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    throw new Error(help);
  }
}

// Validate on module load (server-side only)
if (typeof process !== 'undefined' && process.env) {
  validateServerEnv();
}
