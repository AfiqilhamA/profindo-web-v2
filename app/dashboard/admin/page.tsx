"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatDistanceToNow, format, differenceInDays, isBefore, isAfter, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale"; 

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ open: 0, inProgress: 0, totalActive: 0 });
  const [upcomingServices, setUpcomingServices] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);

    try {
      const { data: woData } = await supabase.from("work_orders").select("status");

      let openCount = 0;
      let inProgressCount = 0;

      if (woData) {
        openCount = woData.filter((wo) => wo.status === "Open").length;
        inProgressCount = woData.filter((wo) => wo.status === "In Progress").length;
      }

      setStats({
        open: openCount,
        inProgress: inProgressCount,
        totalActive: openCount + inProgressCount,
      });

      // Tarik data WO, pastikan bawa jadwal_mulai DAN jadwal_selesai
      const { data: upcomingData } = await supabase
        .from("work_orders")
        .select(`
          id, 
          jadwal_mulai,
          jadwal_selesai, 
          nama_klien,
          machines (nama_klien, kategori, nama_mesin)
        `)
        .in("status", ["Open", "In Progress"])
        .order("jadwal_selesai", { ascending: true }) // Urutkan berdasarkan deadline terdekat
        .limit(10); 

      setUpcomingServices(upcomingData || []);

      const { data: activityData } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15); 

      setRecentActivities(activityData || []);
    } catch (error) {
      console.error("Gagal mengambil data dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = [
    { name: "In Progress", value: stats.inProgress > 0 ? stats.inProgress : 1, color: "#FDBA74" }, 
    { name: "Open", value: stats.open > 0 ? stats.open : 1, color: "#6EE7B7" }, 
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full max-w-5xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Dashboard</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <svg className="animate-spin h-10 w-10 text-[#10B981] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-gray-500 font-bold text-[14px]">Memuat Dashboard...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-[140px]">
              <p className="text-[14px] font-bold text-gray-500">Open Work Orders</p>
              <div className="flex items-center gap-4">
                <h2 className="text-[48px] font-extrabold text-gray-900 leading-none">{stats.open}</h2>
                <div className="w-10 h-10 bg-[#6EE7B7] rounded-[10px] flex items-center justify-center text-white shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between h-[140px]">
              <p className="text-[14px] font-bold text-gray-500">In Progress</p>
              <div className="flex items-center gap-4">
                <h2 className="text-[48px] font-extrabold text-gray-900 leading-none">{stats.inProgress}</h2>
                <div className="w-10 h-10 bg-[#FDBA74] rounded-[10px] flex items-center justify-center text-white shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white border border-gray-100 rounded-[20px] p-8 shadow-sm lg:col-span-2 flex flex-col h-[320px]">
              <h3 className="text-[18px] font-bold text-gray-900 mb-4 shrink-0">Upcoming Services (Deadline)</h3>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-5">
                {upcomingServices.length === 0 ? (
                  <p className="text-[13px] text-gray-400 font-medium h-full flex items-center">Tidak ada jadwal servis yang aktif.</p>
                ) : (
                  upcomingServices.map((wo, index) => {
                    const today = startOfDay(new Date());
                    
                    // Cek ketersediaan tanggal
                    const jadwalMulaiStr = wo.jadwal_mulai; 
                    const jadwalSelesaiStr = wo.jadwal_selesai;

                    let statusBadge = null;

                    if (!jadwalSelesaiStr) {
                      statusBadge = (
                        <div className="bg-gray-50 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ml-4">
                          Tanpa Tenggat
                        </div>
                      );
                    } else {
                      const startDate = jadwalMulaiStr ? startOfDay(new Date(jadwalMulaiStr)) : null;
                      const endDate = startOfDay(new Date(jadwalSelesaiStr));

                      // 1. Jika hari ini belum sampai jadwal mulai -> Hitung "Upcoming in X days"
                      if (startDate && isBefore(today, startDate)) {
                        const daysUntilStart = differenceInDays(startDate, today);
                        statusBadge = (
                          <div className="bg-blue-50 border border-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ml-4">
                            Upcoming in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
                          </div>
                        );
                      } 
                      // 2. Jika hari ini melewati batas tenggat -> "Tenggat Habis"
                      else if (isAfter(today, endDate)) {
                         statusBadge = (
                          <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ml-4">
                            Tenggat Habis / Hari Ini
                          </div>
                        );
                      }
                      // 3. Jika hari ini berada di antara jadwal mulai dan tenggat -> "X Days Left"
                      else {
                         const daysLeft = differenceInDays(endDate, today);
                         if(daysLeft === 0) {
                             statusBadge = (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ml-4">
                                  Tenggat Habis / Hari Ini
                                </div>
                              );
                         } else {
                             statusBadge = (
                                <div className="bg-[#FFF7ED] border border-[#FFEDD5] text-[#EA580C] px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ml-4">
                                  {daysLeft} days Left
                                </div>
                              );
                         }
                      }
                    }
                    
                    const displayedNamaKlien = wo.nama_klien || wo.machines?.nama_klien || "Nama Klien Belum Diatur";
                    const displayedMesin = wo.machines?.kategori || wo.machines?.nama_mesin || "Servis Umum";

                    return (
                      <div key={wo.id || index} className="flex items-center justify-between border-b border-gray-50 pb-5 last:border-0 last:pb-0 shrink-0">
                        <div>
                          <p className="text-[14px] font-bold text-gray-900">{displayedNamaKlien}</p>
                          <p className="text-[12px] font-medium text-gray-400 mt-0.5">
                            {displayedMesin} • Tenggat: {jadwalSelesaiStr ? format(new Date(jadwalSelesaiStr), "dd MMM yyyy") : "Belum diatur"}
                          </p>
                        </div>
                        {statusBadge}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[20px] p-8 shadow-sm flex flex-col items-center relative h-[320px]">
              <h3 className="text-[18px] font-bold text-gray-900 mb-2 w-full text-left shrink-0">Active Work Orders</h3>
              
              <div className="w-full h-full relative mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.totalActive > 0 ? chartData : [{ name: "Kosong", value: 1, color: "#f3f4f6" }]}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {(stats.totalActive > 0 ? chartData : [{ name: "Kosong", value: 1, color: "#f3f4f6" }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                  <h2 className="text-[36px] font-extrabold text-gray-900 leading-none">{stats.totalActive}</h2>
                  <p className="text-[14px] font-bold text-gray-500">Active</p>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white border border-gray-100 rounded-[20px] p-8 shadow-sm flex flex-col h-[350px]">
            <h3 className="text-[18px] font-bold text-gray-900 mb-4 shrink-0">Recent Activity</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
              {recentActivities.length === 0 ? (
                <p className="text-[13px] text-gray-400 font-medium text-center py-6 border border-gray-100 rounded-[12px] h-full flex items-center justify-center">Belum ada aktivitas terekam.</p>
              ) : (
                recentActivities.map((log) => (
                  <div key={log.id} className="border border-gray-100 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-gray-200 transition-colors shrink-0">
                    <p className="text-[13px] font-bold text-gray-800">
                      {log.actor_name} <span className="font-medium text-gray-600">{log.action_text}</span>
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: enUS })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}