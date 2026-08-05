import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Client service_role — uniquement dans des Server Actions ou Route Handlers
// NE JAMAIS importer ce fichier côté client
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
