/**
 * Ask My AI needs the database service key, an embedding key (Gemini) and at
 * least one chat key. Without them the section and button are not shown.
 */
export function askEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(
    env.SUPABASE_SERVICE_ROLE_KEY &&
    env.GEMINI_API_KEY &&
    (env.GROQ_API_KEY || env.GEMINI_API_KEY)
  );
}
