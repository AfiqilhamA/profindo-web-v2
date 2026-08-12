import { supabase } from "./supabase";

/**
 * Generates a unique Work Order number.
 * Format: WO-YYYYMMDD-XXXX (where XXXX is sequential with database collision check & retry)
 */
export async function generateUniqueWoNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `WO-${dateStr}-`;

  // Fetch highest existing wo_number with current prefix to create sequential numbers
  const { data, error } = await supabase
    .from("work_orders")
    .select("wo_number")
    .like("wo_number", `${prefix}%`)
    .order("wo_number", { ascending: false })
    .limit(1);

  let nextSeq = 1;

  if (!error && data && data.length > 0) {
    const lastWo = data[0].wo_number;
    const parts = lastWo.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  // Attempt to generate unique candidate with up to 5 retries in case of concurrent inserts
  for (let attempt = 0; attempt < 5; attempt++) {
    const seqStr = String(nextSeq + attempt).padStart(4, "0");
    const candidate = `${prefix}${seqStr}`;

    const { data: existing } = await supabase
      .from("work_orders")
      .select("id")
      .eq("wo_number", candidate)
      .maybeSingle();

    if (!existing) {
      return candidate;
    }
  }

  // Fallback to timestamp + random suffix if retries exhausted
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${Date.now().toString().slice(-4)}${randomSuffix}`;
}
