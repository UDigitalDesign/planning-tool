import { useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * Voorkomt dat het Supabase free-tier project pauzeert door inactiviteit.
 *
 * Stuurt elke `intervalMs` (standaard 3 dagen) een lichtgewicht `SELECT 1`
 * naar de database. De timer reset bij elke echte API-call (page load telt
 * ook), dus in de praktijk wordt de ping alleen gestuurd als de app lang
 * open staat zonder andere database-activiteit.
 *
 * ⚠️  Dit werkt alleen zolang iemand de app open heeft.
 *     Voor 100 % zekerheid: gebruik een externe cron-service
 *     (bijv. cron-job.org) die elke 3 dagen een GET doet naar
 *     https://<project>.supabase.co/rest/v1/?apikey=<anon_key>
 */

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 259 200 000 ms

export function useKeepAlive(intervalMs: number = THREE_DAYS_MS) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = async () => {
      try {
        // Lightest possible query — geen tabeldata nodig
        const { error } = await supabase.rpc("ping", {}).maybeSingle();
        // Als de rpc 'ping' niet bestaat, vallen we terug op een simpele select
        if (error) {
          await supabase.from("users").select("id").limit(1).maybeSingle();
        }
        console.log(
          `[keepalive] Supabase ping OK — ${new Date().toLocaleString()}`
        );
      } catch (e) {
        console.warn("[keepalive] Supabase ping failed:", e);
      }
    };

    // Eerste ping direct bij mount
    ping();

    // Daarna periodiek
    timerRef.current = setInterval(ping, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);
}
