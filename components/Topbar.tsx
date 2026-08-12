"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../utils/supabase";

// 1. TAMBAHIN INTERFACE INI BIAR TYPESCRIPT NGGAK NGAMBEK
interface TopbarProps {
  setIsSidebarOpen: (val: boolean) => void;
}

// 2. TERIMA DATA PROP-NYA DI SINI
export default function Topbar({ setIsSidebarOpen }: TopbarProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeUserName, setActiveUserName] = useState("Admin");
  
  const pathname = usePathname(); 

  const getPageTitle = () => {
    if (pathname === "/dashboard/admin") return "Dashboard";
    if (pathname?.includes("/inventory")) return "Inventory";
    if (pathname?.includes("/work-orders")) return "Work Orders";
    if (pathname?.includes("/team")) return "Team";
    if (pathname?.includes("/settings")) return "Settings";
    return "Admin Dashboard"; 
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("id-ID", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setCurrentTime(timeString);
    }, 1000);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from("technicians").select("nama_lengkap, foto_profil").eq("email", user.email ?? "").maybeSingle();
      if (profile?.foto_profil) setAvatarUrl(profile.foto_profil);
      if (profile?.nama_lengkap) setActiveUserName(profile.nama_lengkap);
    });

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 sticky top-0">
      
      <div className="flex items-center gap-4">
        {/* 3. PANGGIL FUNGSI BUKA SIDEBAR PAS TOMBOL HP DIKLIK */}
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-black">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 hidden sm:block transition-all duration-300">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center overflow-hidden w-[200px]">
          <div className="text-[13px] text-gray-600 shrink-0 tracking-tight font-medium">{currentTime || "00.00.00"}</div>
          <span className="text-gray-300 font-medium mx-3 shrink-0">|</span>
          <div className="flex-1 overflow-hidden relative h-5 flex items-center group cursor-default">
            <div className="absolute whitespace-nowrap text-[13px] text-gray-600 animate-marquee group-hover:pause-animation">
              Welcome, {activeUserName}
            </div>
          </div>
        </div>

        <div className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-[12px] shadow-sm overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : "PT"}
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(120px); } 
          100% { transform: translateX(-100%); } 
        }
        .animate-marquee { display: inline-block; animation: marquee 8s linear infinite; }
        .pause-animation { animation-play-state: paused !important; }
      `}</style>
    </header>
  );
}