"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // STATE BARU UNTUK POP-UP LOGOUT
  
  const [activeUserName, setActiveUserName] = useState("Loading...");
  const [activeUserRole, setActiveUserRole] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from("technicians").select("nama_lengkap, role").eq("email", user.email ?? "").maybeSingle();
      if (profile?.nama_lengkap) setActiveUserName(profile.nama_lengkap);
      if (profile?.role) setActiveUserRole(profile.role);
    });
  }, []);

  const menuItems = [
    { name: "Dashboard", path: "/dashboard/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Inventory", path: "/dashboard/admin/inventory", icon: "M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Work Orders", path: "/dashboard/admin/work-orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { name: "Team", path: "/dashboard/admin/team", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { name: "Settings", path: "/dashboard/admin/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  // Fungsi buat nampilin Modal (Mencegah langsung kehapus)
  const triggerLogout = () => {
    setIsProfileOpen(false);
    setIsLogoutModalOpen(true);
  };

  // Fungsi Eksekusi Logout beneran
  const confirmLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#333333] transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-6 shrink-0 pt-4 mb-4">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-red-500">Profindo</span> <span className="text-white">Admin</span>
          </span>
          <button className="md:hidden text-gray-400 hover:text-white p-1" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (pathname?.startsWith(item.path + "/") && item.path !== "/dashboard/admin");
            return (
              <Link key={item.name} href={item.path} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-4 py-3 rounded-lg text-[15px] transition-all ${isActive ? "text-white font-bold" : "text-gray-400 font-normal hover:text-gray-200"}`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 shrink-0 relative">
          {isProfileOpen && (
            <div className="absolute bottom-[80px] left-4 right-4 bg-[#262626] border border-gray-600/50 rounded-xl p-2 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
              {/* TOMBOL LOGOUT SEKARANG MANGGIL MODAL, BUKAN LANGSUNG KELUAR */}
              <button onClick={triggerLogout} className="w-full flex items-center justify-center gap-2 bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[14px] py-2.5 rounded-[8px] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Log out
              </button>
            </div>
          )}

          <div onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#404040] cursor-pointer hover:bg-[#4a4a4a] transition-colors border border-gray-600/50">
            <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {getInitials(activeUserName)}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="block text-[14px] font-bold text-white truncate">{activeUserName}</span>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{activeUserRole}</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </div>
      </aside>

      {/* ========================================= */}
      {/* MODAL POP-UP KONFIRMASI LOGOUT */}
      {/* ========================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </div>
            
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Akhiri Sesi?</h3>
            <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
              Anda akan keluar dari sistem Admin Profindo. Pastikan semua pekerjaan Anda telah tersimpan.
            </p>
            
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full"
              >
                Batal
              </button>
              <button 
                onClick={confirmLogout} 
                className="px-6 py-2.5 text-[13px] font-bold text-white bg-[#E11D48] rounded-[10px] hover:bg-rose-700 transition-colors w-full flex items-center justify-center gap-2"
              >
                Ya, Keluar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}