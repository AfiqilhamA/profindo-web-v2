import { redirect } from "next/navigation";

export default function Home() {
  // Biar kalau ada yang buka web lo, langsung otomatis dilempar ke halaman login
  redirect("/login");
}