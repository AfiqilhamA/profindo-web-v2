"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase"; 

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"admin" | "technician">("admin");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ==========================================
  // FITUR: SATPAM SESI (DIUPDATE BUAT GUEST)
  // ==========================================
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from("technicians").select("role").eq("email", user.email ?? "").maybeSingle();
      if (profile?.role?.toLowerCase().includes("admin")) router.push("/dashboard/admin");
      else if (profile) router.push("/technician");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrorMsg(result.error || "Email atau Password salah!");
        return;
      }

      const data = result;
      const userRoleLower = (data.role || "").toLowerCase();
      const isActuallyAdmin = userRoleLower.includes("admin");
      
      if (activeTab === "admin" && !isActuallyAdmin) {
        await supabase.auth.signOut();
        setErrorMsg("Akun ini bukan Admin! Silakan login lewat tab Technician.");
        return;
      }
      if (activeTab === "technician" && isActuallyAdmin) {
        await supabase.auth.signOut();
        setErrorMsg("Akun ini adalah Admin! Silakan login lewat tab Admin.");
        return;
      }

      if (isActuallyAdmin) {
        router.push("/dashboard/admin");
      } else {
        router.push("/technician"); 
      }

    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi gangguan pada server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => router.push("/guest");

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#F4F5F7]">
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="absolute w-[400px] h-[400px] bg-red-600/80 rounded-full blur-[120px] -translate-x-40 mix-blend-multiply opacity-80"></div>
        <div className="absolute w-[400px] h-[400px] bg-red-600/80 rounded-full blur-[120px] translate-x-40 translate-y-10 mix-blend-multiply opacity-80"></div>
      </div>

      <div className="z-10 mb-8 flex flex-col items-center">
        <img src="/logo.png" alt="Profindo Logo" className="h-16 object-contain" />
      </div>

      <div className="z-10 w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10">
        <h2 className="text-xl font-extrabold text-black mb-6">Portal Akses</h2>

        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => { setActiveTab("admin"); setErrorMsg(""); }}
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "admin" ? "border-red-600 text-black" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => { setActiveTab("technician"); setErrorMsg(""); }}
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "technician" ? "border-red-600 text-black" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Technician
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in fade-in zoom-in duration-300">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="text-sm font-bold text-red-700 leading-tight">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm placeholder:text-gray-300 font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-black">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm placeholder:text-gray-300 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" disabled={isLoading} className={`w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
              {isLoading ? "Memproses..." : "Sign in"}
            </button>
            
            <button type="button" onClick={handleGuestLogin} className="w-full bg-white text-gray-700 font-bold py-3.5 rounded-xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors active:scale-[0.98]">
              Sign in as Guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}