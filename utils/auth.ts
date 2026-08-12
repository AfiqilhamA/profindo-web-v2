import { UserProfile } from "../types";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isAdmin: boolean;
  isTechnician: boolean;
  isGuest: boolean;
}

export function getCurrentSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;

  const userName = localStorage.getItem("user_name");
  const userRole = localStorage.getItem("user_role");
  const userId = localStorage.getItem("user_id") || "";
  const avatar = localStorage.getItem("admin_avatar") || undefined;

  if (!userName || !userRole) {
    return null;
  }

  const roleLower = userRole.toLowerCase();
  const isAdmin = roleLower.includes("admin");
  const isGuest = roleLower.includes("guest");
  const isTechnician = !isAdmin && !isGuest;

  return {
    id: userId,
    name: userName,
    role: userRole,
    avatar,
    isAdmin,
    isTechnician,
    isGuest
  };
}

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_id");
  localStorage.removeItem("admin_avatar");
}
