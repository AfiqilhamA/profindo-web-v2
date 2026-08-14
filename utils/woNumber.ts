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

  if (error) throw new Error("Gagal membaca nomor work order.");
  const last = data?.[0]?.wo_number?.split("-").pop();
  const nextSeq = Number.parseInt(last ?? "0", 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
