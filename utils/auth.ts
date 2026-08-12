import { supabase } from "./supabase";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isAdmin: boolean;
  isTechnician: boolean;
  isGuest: boolean;
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("technicians").select("id, nama_lengkap, role, foto_profil").eq("email", user.email ?? "").maybeSingle();
  if (!profile) return null;
  const roleLower = profile.role.toLowerCase();
  return {
    id: profile.id,
    name: profile.nama_lengkap,
    role: profile.role,
    avatar: profile.foto_profil,
    isAdmin: roleLower.includes("admin"),
    isTechnician: !roleLower.includes("admin") && !roleLower.includes("guest"),
    isGuest: roleLower.includes("guest"),
  };
}

export async function clearSessionUser(): Promise<void> {
  await supabase.auth.signOut();
}
