"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../../utils/supabase";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "company" | "data" | "trash">("whatsapp");
  
  // ==========================================
  // STATE: WHATSAPP
  // ==========================================
  const [savedWaNumber, setSavedWaNumber] = useState("081234567890");
  const [waNumber, setWaNumber] = useState("081234567890"); 
  const [waTemplate, setWaTemplate] = useState("Halo Bapak/Ibu Klien, berikut kami lampirkan dokumen Riwayat Service untuk mesin terkait. Terima kasih!");
  
  // ==========================================
  // STATE: COMPANY PROFILE
  // ==========================================
  const [companyName, setCompanyName] = useState("PT. Profindo Admin");
  const [companyAddress, setCompanyAddress] = useState("Jl. Teknologi No. 88, Jakarta");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ==========================================
  // STATE: TEMPAT SAMPAH (TRASH)
  // ==========================================
  const [deletedMachines, setDeletedMachines] = useState<any[]>([]);
  const [deletedTechs, setDeletedTechs] = useState<any[]>([]);
  const [isFetchingTrash, setIsFetchingTrash] = useState(false);
  const [restoreItem, setRestoreItem] = useState({ id: "", type: "", nama: "" });

  // ==========================================
  // STATE: UNIVERSAL MODAL KONFIRMASI
  // ==========================================
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "wa" | "company" | "backup" | "clear_logs" | "restore_machine" | "restore_tech" | "";
    status: "confirm" | "saving" | "success" | "error";
    title: string;
    desc: string;
  }>({
    isOpen: false, type: "", status: "confirm", title: "", desc: ""
  });

  // Load semua data dari local storage pas pertama kali render
  useEffect(() => {
    // Load Avatar & WA
    const savedAvatar = localStorage.getItem("admin_avatar");
    if (savedAvatar) setAvatarPreview(savedAvatar);

    const activeWa = localStorage.getItem("admin_wa_number");
    if (activeWa) {
      setSavedWaNumber(activeWa);
      setWaNumber(activeWa);
    }

    // Load Template WA
    const savedWaTemplate = localStorage.getItem("admin_wa_template");
    if (savedWaTemplate) setWaTemplate(savedWaTemplate);

    // Load Profil Perusahaan
    const savedCompanyName = localStorage.getItem("admin_company_name");
    if (savedCompanyName) setCompanyName(savedCompanyName);

    const savedCompanyAddress = localStorage.getItem("admin_company_address");
    if (savedCompanyAddress) setCompanyAddress(savedCompanyAddress);
  }, []);

  // Tiap kali pindah ke tab Tempat Sampah, tarik data yang kehapus
  useEffect(() => {
    if (activeTab === "trash") {
      fetchTrashData();
    }
  }, [activeTab]);

  const fetchTrashData = async () => {
    setIsFetchingTrash(true);
    const [resMachines, resTechs] = await Promise.all([
      supabase.from("machines").select("*").eq("is_deleted", true).order("created_at", { ascending: false }),
      supabase.from("technicians").select("*").eq("is_deleted", true).order("created_at", { ascending: false })
    ]);
    
    setDeletedMachines(resMachines.data || []);
    setDeletedTechs(resTechs.data || []);
    setIsFetchingTrash(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const triggerAction = (type: "wa" | "company" | "backup" | "clear_logs", e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let title = ""; let desc = "";
    if (type === "wa") { title = "Simpan Pengaturan WA?"; desc = "Nomor pengirim dan template pesan akan diperbarui."; }
    else if (type === "company") { title = "Simpan Profil?"; desc = "Nama, alamat, dan logo perusahaan akan diperbarui."; }
    else if (type === "backup") { title = "Backup Data?"; desc = "Seluruh data sistem akan diunduh dalam format JSON."; }
    else if (type === "clear_logs") { title = "Kosongkan Log?"; desc = "Semua riwayat aktivitas akan dihapus permanen. Aksi ini tidak dapat dibatalkan."; }

    setActionModal({ isOpen: true, type, status: "confirm", title, desc });
  };

  const triggerRestore = (id: string, type: "restore_machine" | "restore_tech", nama: string) => {
    setRestoreItem({ id, type, nama });
    setActionModal({
      isOpen: true,
      type,
      status: "confirm",
      title: "Pulihkan Data?",
      desc: `Data "${nama}" akan dikembalikan ke daftar aktif sistem.`
    });
  };

  const executeAction = async () => {
    setActionModal((prev) => ({ ...prev, status: "saving" }));

    try {
      if (actionModal.type === "wa") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        localStorage.setItem("admin_wa_number", waNumber);
        localStorage.setItem("admin_wa_template", waTemplate); // Simpan WA Template
        setSavedWaNumber(waNumber);
      } 
      else if (actionModal.type === "company") {
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `avatar-${Date.now()}.${fileExt}`;
          const { data } = await supabase.storage.from('machine_files').upload(`profile/${fileName}`, avatarFile, { upsert: true });
          if (data) {
            const { data: pubUrl } = supabase.storage.from('machine_files').getPublicUrl(`profile/${fileName}`);
            localStorage.setItem("admin_avatar", pubUrl.publicUrl);
            setAvatarPreview(pubUrl.publicUrl);
          }
        }
        // Simpan Profil ke Local Storage
        localStorage.setItem("admin_company_name", companyName);
        localStorage.setItem("admin_company_address", companyAddress);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } 
      else if (actionModal.type === "clear_logs") {
        const { error } = await supabase.from("activity_logs").delete().neq("id", -1); 
        if (error) throw error;
      } 
      else if (actionModal.type === "backup") {
        const { data: machines } = await supabase.from("machines").select("*");
        const { data: workOrders } = await supabase.from("work_orders").select("*");
        const backupData = {
          tanggal_backup: new Date().toISOString(),
          total_mesin: machines?.length || 0,
          total_work_orders: workOrders?.length || 0,
          data_mesin: machines,
          data_work_orders: workOrders
        };
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Backup_Profindo_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      else if (actionModal.type === "restore_machine") {
        const { error } = await supabase.from("machines").update({ is_deleted: false }).eq("id", restoreItem.id);
        if (error) throw error;
      }
      else if (actionModal.type === "restore_tech") {
        const { error } = await supabase.from("technicians").update({ is_deleted: false }).eq("id", restoreItem.id);
        if (error) throw error;
      }

      setActionModal((prev) => ({ ...prev, status: "success" }));
      setTimeout(() => {
        setActionModal((prev) => ({ ...prev, isOpen: false, status: "confirm" }));
        if (actionModal.type === "restore_machine" || actionModal.type === "restore_tech") {
          fetchTrashData();
        }
      }, 1500);

    } catch (error: any) {
      alert("Terjadi kesalahan: " + error.message);
      setActionModal((prev) => ({ ...prev, isOpen: false, status: "confirm" }));
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full max-w-6xl mx-auto relative px-4 md:px-0">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-8 mt-4 md:mt-0">
        <h1 className="text-[22px] md:text-[26px] font-bold text-gray-900 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-[12px] md:text-[13px] text-gray-500 font-medium mt-1">Kelola konfigurasi WhatsApp, Profil Perusahaan, Basis Data, dan Pemulihan.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
        {/* === SIDEBAR KIRI (RESPONSIF MENU) === */}
        <div className="w-full md:w-[240px] shrink-0 bg-white border border-gray-200 rounded-[16px] p-2 shadow-sm flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:sticky md:top-24 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setActiveTab("whatsapp")} className={`shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-[10px] text-[12px] md:text-[13px] font-bold transition-all text-left ${activeTab === "whatsapp" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            WhatsApp
          </button>
          <button onClick={() => setActiveTab("company")} className={`shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-[10px] text-[12px] md:text-[13px] font-bold transition-all text-left ${activeTab === "company" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Profil Perusahaan
          </button>
          <button onClick={() => setActiveTab("data")} className={`shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-[10px] text-[12px] md:text-[13px] font-bold transition-all text-left ${activeTab === "data" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            Manajemen Data
          </button>
          <div className="hidden md:block h-px bg-gray-100 my-1 mx-2"></div>
          <button onClick={() => setActiveTab("trash")} className={`shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-[10px] text-[12px] md:text-[13px] font-bold transition-all text-left ${activeTab === "trash" ? "bg-red-50 text-red-600 border border-red-100" : "text-gray-600 hover:bg-red-50 hover:text-red-600"}`}>
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Tempat Sampah
          </button>
        </div>

        {/* === KONTEN KANAN === */}
        <div className="flex-1 w-full">
          
          {/* TAB 1: WHATSAPP */}
          {activeTab === "whatsapp" && (
            <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-5 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-[15px] md:text-[16px] font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.055c-1.706 0-3.376-.43-4.85-1.246l-5.38 1.411 1.44-5.244c-.893-1.523-1.365-3.266-1.365-5.045 0-5.464 4.446-9.911 9.91-9.911 2.648 0 5.142 1.031 7.013 2.903 1.872 1.871 2.903 4.364 2.903 7.012 0 5.464-4.446 9.911-9.911 9.911m-6.196-3.84c.895.53 1.93.81 2.986.81 4.542 0 8.24-3.698 8.24-8.24 0-4.542-3.698-8.24-8.24-8.24-4.541 0-8.24 3.698-8.24 8.24 0 1.096.29 2.152.839 3.067l-.85 3.097 3.165-.834zm9.362-5.748c-.201-.101-1.196-.59-1.382-.657-.185-.067-.321-.101-.456.101-.136.202-.524.657-.643.791-.118.134-.237.151-.438.05-.201-.101-.854-.315-1.626-.999-.601-.532-1.006-1.19-1.124-1.391-.118-.202-.012-.311.088-.412.091-.091.201-.235.302-.353.101-.118.134-.202.201-.336.067-.134.034-.253-.017-.354-.05-.101-.456-1.101-.625-1.508-.164-.396-.33-.342-.456-.348h-.388c-.135 0-.356.05-.541.253-.186.202-.711.691-.711 1.685 0 .994.727 1.954.828 2.088.101.134 1.424 2.174 3.447 3.045 1.571.68 2.181.733 3.013.633.955-.115 1.196-.583 1.332-1.077.135-.494.135-.918.094-1.008-.041-.09-.136-.14-.337-.241z"></path></svg>
                    Pengaturan WhatsApp
                  </h2>
                  <p className="text-[12px] md:text-[13px] text-gray-500 mt-1">Atur nomor pengirim dan format pesan otomatis saat membagikan dokumen PDF.</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-[8px] px-4 py-2 flex items-center gap-3 shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Nomor Aktif</p>
                    <p className="text-[13px] font-extrabold text-green-900">{savedWaNumber}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => triggerAction("wa", e)} className="p-5 md:p-8 space-y-5 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Ubah Nomor Pengirim (WA Sender)</label>
                  <input type="text" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} className="w-full border border-gray-200 rounded-[8px] px-4 py-2.5 text-[13px] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 font-medium transition-all" />
                  <p className="text-[11px] text-gray-400 font-medium">Format wajib diawali angka 0 (Contoh: 08123...).</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Template Pesan Otomatis</label>
                  <textarea rows={5} value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} className="w-full border border-gray-200 rounded-[8px] px-4 py-3 text-[13px] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 font-medium resize-none transition-all"></textarea>
                  <p className="text-[11px] text-gray-400 font-medium">Teks ini akan terisi otomatis di HP Admin saat menekan tombol "Kirim WA".</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" className="w-full md:w-auto bg-[#2D68FF] hover:bg-blue-700 text-white px-8 py-3 md:py-2.5 rounded-[8px] text-[13px] font-bold shadow-sm transition-colors">Simpan Pengaturan</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: COMPANY PROFILE */}
          {activeTab === "company" && (
            <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-5 md:p-8 border-b border-gray-100">
                <h2 className="text-[15px] md:text-[16px] font-bold text-gray-900">Profil Perusahaan & Admin</h2>
                <p className="text-[12px] md:text-[13px] text-gray-500 mt-1">Identitas ini akan tercetak otomatis di dokumen PDF dan Top Bar sistem.</p>
              </div>
              <form onSubmit={(e) => triggerAction("company", e)} className="p-5 md:p-8 space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 bg-gray-50 p-5 md:p-6 rounded-[12px] border border-gray-100">
                  <div className="relative shrink-0 w-20">
                    <div className="w-20 h-20 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                      {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-[16px] font-bold text-gray-400">PT</span>}
                    </div>
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-gray-800 transition-colors border-2 border-white">
                      <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </label>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-gray-800">Foto Profil Top Bar</h3>
                    <p className="text-[11px] text-gray-500 mt-1">Format JPG atau PNG. Ukuran ideal 200x200px.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Nama Perusahaan Resmi</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-gray-200 rounded-[8px] px-4 py-2.5 text-[13px] outline-none focus:border-black font-medium" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Alamat Lengkap Perusahaan</label>
                  <textarea rows={4} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="w-full border border-gray-200 rounded-[8px] px-4 py-3 text-[13px] outline-none focus:border-black font-medium resize-none"></textarea>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" className="w-full md:w-auto bg-black hover:bg-gray-800 text-white px-8 py-3 md:py-2.5 rounded-[8px] text-[13px] font-bold shadow-sm transition-colors">Simpan Profil</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MANAJEMEN DATA & BACKUP */}
          {activeTab === "data" && (
            <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-5 md:p-8 border-b border-gray-100">
                <h2 className="text-[15px] md:text-[16px] font-bold text-gray-900">Manajemen Data & Cache</h2>
                <p className="text-[12px] md:text-[13px] text-gray-500 mt-1">Ruang kontrol database untuk backup data dan mencegah penumpukan log.</p>
              </div>
              
              <div className="p-5 md:p-8 space-y-6">
                <div className="border border-gray-200 rounded-[12px] p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h3 className="text-[14px] font-bold text-gray-900 mb-1">Kapasitas Database (Free Tier)</h3>
                  <p className="text-[12px] text-gray-500 mb-4">Penggunaan ruang penyimpanan utama server Supabase Anda.</p>
                  <div className="w-full bg-gray-100 rounded-full h-3.5 mb-2 overflow-hidden border border-gray-200/50">
                    <div className="bg-[#2D68FF] h-full rounded-full w-[24%] transition-all duration-1000"></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-gray-500">
                    <span>120 MB Terpakai</span>
                    <span>500 MB Maksimal</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-5 md:p-6 border border-blue-100 bg-blue-50/30 rounded-[12px]">
                  <div>
                    <h3 className="text-[14px] font-bold text-blue-800 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Backup Seluruh Data
                    </h3>
                    <p className="text-[12px] text-gray-600 mt-1 md:max-w-md">Unduh seluruh data Mesin dan Work Order ke format JSON lokal sebagai cadangan.</p>
                  </div>
                  <button type="button" onClick={() => triggerAction("backup")} className="w-full md:w-auto shrink-0 bg-[#2D68FF] text-white hover:bg-blue-700 px-6 py-3 md:py-2.5 rounded-[8px] text-[12px] font-bold transition-all shadow-sm">
                    Download Backup
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-5 md:p-6 border border-red-100 bg-red-50/50 rounded-[12px]">
                  <div>
                    <h3 className="text-[14px] font-bold text-red-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Bersihkan Log Aktivitas
                    </h3>
                    <p className="text-[12px] text-gray-600 mt-1 md:max-w-md">Hapus semua riwayat "Recent Activity" di Dashboard. Data Mesin/WO tetap aman.</p>
                  </div>
                  <button type="button" onClick={() => triggerAction("clear_logs")} className="w-full md:w-auto shrink-0 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-3 md:py-2.5 rounded-[8px] text-[12px] font-bold transition-all shadow-sm">
                    Kosongkan Log
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPAT SAMPAH (RECYCLE BIN) */}
          {activeTab === "trash" && (
            <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-5 md:p-8 border-b border-gray-100">
                <h2 className="text-[15px] md:text-[16px] font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Tempat Sampah (Recycle Bin)
                </h2>
                <p className="text-[12px] md:text-[13px] text-gray-500 mt-1">Pulihkan data mesin atau teknisi yang tidak sengaja terhapus.</p>
              </div>
              
              {isFetchingTrash ? (
                <div className="p-10 md:p-16 flex flex-col items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p className="text-sm font-bold text-gray-500">Mencari data terhapus...</p>
                </div>
              ) : deletedMachines.length === 0 && deletedTechs.length === 0 ? (
                <div className="p-10 md:p-16 flex flex-col items-center justify-center text-center bg-gray-50/50">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 border border-gray-200 shadow-inner">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                  </div>
                  <h3 className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-2">Tempat Sampah Kosong</h3>
                  <p className="text-[12px] md:text-[13px] text-gray-500 max-w-sm leading-relaxed">Belum ada data yang terhapus saat ini.</p>
                </div>
              ) : (
                <div className="p-5 md:p-6 space-y-6 md:space-y-8">
                  {/* DAFTAR MESIN TERHAPUS */}
                  {deletedMachines.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Mesin Terhapus</h3>
                      <div className="space-y-3">
                        {deletedMachines.map((machine) => (
                          <div key={machine.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-[12px] bg-gray-50">
                            <div>
                              <p className="text-[13px] md:text-[14px] font-bold text-gray-900">{machine.nama_mesin}</p>
                              <p className="text-[11px] md:text-[12px] text-gray-500 mt-0.5">ID: {machine.product_id || "-"} • Kategori: {machine.kategori || "-"}</p>
                            </div>
                            <button 
                              onClick={() => triggerRestore(machine.id, "restore_machine", machine.nama_mesin)}
                              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold rounded-[8px] hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                              Pulihkan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DAFTAR TEKNISI TERHAPUS */}
                  {deletedTechs.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Teknisi Terhapus</h3>
                      <div className="space-y-3">
                        {deletedTechs.map((tech) => (
                          <div key={tech.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-[12px] bg-gray-50">
                            <div className="flex items-center gap-3">
                              {tech.foto_profil ? (
                                <img src={tech.foto_profil} alt={tech.nama_lengkap} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                                </div>
                              )}
                              <div>
                                <p className="text-[13px] md:text-[14px] font-bold text-gray-900">{tech.nama_lengkap}</p>
                                <p className="text-[11px] md:text-[12px] text-gray-500 mt-0.5">{tech.role} • {tech.email}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => triggerRestore(tech.id, "restore_tech", tech.nama_lengkap)}
                              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[12px] font-bold rounded-[8px] hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                              Pulihkan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========================================= */}
      {/* UNIVERSAL MODAL KONFIRMASI (2-STEP) */}
      {/* ========================================= */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-6 md:p-8 text-center animate-in zoom-in-95 duration-200">
            
            {actionModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Aksi telah berhasil dieksekusi.</p>
              </div>
            ) : actionModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Memproses...</h3>
              </div>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${actionModal.type === 'clear_logs' ? 'bg-red-100 text-red-500' : 'bg-blue-50 text-[#2D68FF] border border-blue-100'}`}>
                  {actionModal.type === 'clear_logs' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  ) : actionModal.type === 'backup' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  ) : actionModal.type === 'restore_machine' || actionModal.type === 'restore_tech' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                  )}
                </div>
                
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">{actionModal.title}</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">{actionModal.desc}</p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-3 sm:py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full">Batal</button>
                  <button onClick={executeAction} className={`px-6 py-3 sm:py-2.5 text-[13px] font-bold text-white rounded-[10px] transition-colors w-full ${actionModal.type === 'clear_logs' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}>
                    {actionModal.type === 'clear_logs' ? "Ya, Kosongkan" : actionModal.type.includes('restore') ? "Ya, Pulihkan" : "Ya, Lanjutkan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}