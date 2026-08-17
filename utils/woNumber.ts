import { supabase } from "./supabase";

/**
 * Generates a unique Work Order number.
 * Format: WO-YYYYMMDD-XXXX (where XXXX is sequential with database collision check & retry)
 */
export async function generateUniqueWoNumber(attempt = 0): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `WO-${dateStr}-`;

  try {
    // Fetch highest existing wo_number with current prefix to create sequential numbers
    const { data, error } = await supabase
      .from("work_orders")
      .select("wo_number")
      .like("wo_number", `${prefix}%`)
      .order("wo_number", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Gagal membaca nomor work order dari database:", error);
      const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${fallbackSeq}`;
    }

    const last = data?.[0]?.wo_number?.split("-").pop();
    const lastSeq = Number.parseInt(last ?? "0", 10);
    const baseSeq = Number.isNaN(lastSeq) ? 0 : lastSeq;
    // For retries (attempt > 0), add a random jitter offset (1..20) + attempt to break lockstep alignment between concurrent callers
    const randomJitter = attempt > 0 ? Math.floor(Math.random() * 20) + 1 : 0;
    const nextSeq = baseSeq + 1 + attempt + randomJitter;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  } catch (err) {
    console.error("Error generating wo_number:", err);
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${fallbackSeq}`;
  }
}
