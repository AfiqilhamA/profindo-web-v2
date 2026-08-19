"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabase";

export default function TeamPage() {
  const router = useRouter();

  // --- STATE DATA ---
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE PENCARIAN & FILTER ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState("Semua");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- STATE UNTUK MODAL EDIT ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  
  const [editFormData, setEditFormData] = useState({
    nama_lengkap: "", email: "", username: "", no_whatsapp: "", role: "", password: ""
  });
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- STATE CUSTOM MODAL 2-LANGKAH ---
  const [submitModal, setSubmitModal] = useState<{isOpen: boolean, status: "confirm" | "saving" | "success" | "error", message?: string}>({ isOpen: false, status: "confirm" });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", nama: "", status: "idle" as "idle" | "deleting" | "success" });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchTeam();
  }, []);

  // --- LOGIKA BARU: Cuma narik tim yang belum masuk tempat sampah ---
  const fetchTeam = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
      
    if (!error) setTeam(data || []);
    setIsLoading(false);
  };

  let processedTeam = [...team];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedTeam = processedTeam.filter(t => 
      t.nama_lengkap?.toLowerCase().includes(q) || 
      t.username?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    );
  }

  if (filterRole !== "Semua") {
    processedTeam = processedTeam.filter(t => t.role === filterRole);
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.email.includes("@")) {
      setSubmitModal({ isOpen: true, status: "error", message: "Format email tidak valid! Harus menggunakan '@'." });
      return;
    }
    setSubmitModal({ isOpen: true, status: "confirm" });
  };

  // --- LOGIKA EDIT DIPERBARUI: Kirim ke API VIP ---
  const executeEdit = async () => {
    setSubmitModal({ isOpen: true, status: "saving" });
    let fotoUrl = selectedTech.foto_profil;

    if (editFotoFile) {
      const fileExt = editFotoFile.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from('machine_files').upload(`profiles/${fileName}`, editFotoFile);
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`profiles/${fileName}`);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTech.id,
          email: editFormData.email,
          password: editFormData.password, // Bakal dikirim, kosong atau isi
          nama_lengkap: editFormData.nama_lengkap,
          username: editFormData.username,
          no_whatsapp: editFormData.no_whatsapp,
          role: editFormData.role,
          fotoUrl: fotoUrl
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengupdate teknisi");

      setSubmitModal({ isOpen: true, status: "success" });
      setTimeout(() => {
        setSubmitModal({ isOpen: false, status: "confirm" });
        setIsEditModalOpen(false);
        fetchTeam();
      }, 1500);

    } catch (error: any) {
      setSubmitModal({ isOpen: true, status: "error", message: error.message });
    }
  };

  const triggerDelete = () => {
    if (!selectedTech) return;
    setDeleteModal({ isOpen: true, id: selectedTech.id, nama: selectedTech.nama_lengkap, status: "idle" });
  };

  // --- LOGIKA BARU: Soft Delete (Update is_deleted jadi TRUE) ---
  const executeDelete = async () => {
    setDeleteModal({ ...deleteModal, status: "deleting" });
    
    const { error } = await supabase
      .from("technicians")
      .update({ is_deleted: true }) 
      .eq("id", deleteModal.id);
    
    if (error) {
      alert("Gagal menghapus: " + error.message);
      setDeleteModal({ ...deleteModal, status: "idle", isOpen: false });
    } else {
      setDeleteModal({ ...deleteModal, status: "success" });
      
      await supabase.from("activity_logs").insert([{
        actor_name: "Admin",
        action_text: `memindahkan ${deleteModal.nama} ke tempat sampah`,
        tipe_aktivitas: "Team"
      }]);

      setTimeout(() => {
        setDeleteModal({ isOpen: false, id: "", nama: "", status: "idle" });
        setIsEditModalOpen(false);
        fetchTeam();
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 relative">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Team</h1>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1 z-20">
          <div className="relative w-full max-w-[320px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" placeholder="Search....." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-[8px] pl-10 pr-4 py-2.5 text-[13px] outline-none focus:border-black transition-colors bg-white shadow-sm"
            />
          </div>

          <div className="relative border-l border-gray-200 pl-4" ref={dropdownRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 border rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors ${filterRole !== "Semua" || isFilterOpen ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filter {filterRole !== "Semua" && `(${filterRole})`}
            </button>

            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-gray-200 rounded-[12px] shadow-2xl p-4 z-50">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Filter by Role</p>
                <div className="space-y-2">
                  {["Semua", "Admin", "Technician (Lapangan)"].map((role) => (
                    <label key={role} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" name="roleFilter" 
                        checked={filterRole === role} 
                        onChange={() => { setFilterRole(role); setIsFilterOpen(false); }}
                        className="w-4 h-4 accent-black bg-gray-100 border-gray-300 cursor-pointer" 
                      />
                      <span className="text-[13px] font-bold text-gray-700 group-hover:text-black">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => router.push("/dashboard/admin/team/add")}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all active:scale-95 flex items-center gap-2 shrink-0 shadow-md z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Tambah Teknisi
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-6">
        <h2 className="text-[13px] font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4">Nama</h2>
        
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 text-[13px]">Memuat data tim...</div>
        ) : processedTeam.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-[13px]">Tidak ada teknisi ditemukan.</div>
        ) : (
          <div className="space-y-3">
            {processedTeam.map((tech) => (
              <div key={tech.id} className="flex items-center justify-between border border-gray-200 p-4 rounded-[12px] hover:border-gray-300 transition-colors bg-white shadow-sm group">
                <div className="flex items-center gap-4">
                  {tech.foto_profil ? (
                    <img src={tech.foto_profil} alt={tech.nama_lengkap} className="w-11 h-11 rounded-full object-cover border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-bold text-gray-900 leading-tight">{tech.nama_lengkap}</p>
                    <p className="text-[12px] text-gray-500">{tech.role}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => {
                    setSelectedTech(tech);
                    setEditFotoFile(null);
                    setEditFormData({
                      nama_lengkap: tech.nama_lengkap || "", email: tech.email || "", username: tech.username || "",
                      no_whatsapp: tech.no_whatsapp || "", role: tech.role || "Technician (Lapangan)", 
                      password: "" // <-- Ini gue jamin kosong melompong dari awal!
                    });
                    setIsEditModalOpen(true);
                  }} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-[8px] text-gray-400 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditModalOpen && selectedTech && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-gray-900">Detail & Edit Teknisi</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmitClick} className="p-6">
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative w-24 h-24 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden group shadow-sm">
                  {editFotoFile ? (
                    <img src={URL.createObjectURL(editFotoFile)} alt="Preview Baru" className="w-full h-full object-cover" />
                  ) : selectedTech.foto_profil ? (
                    <img src={selectedTech.foto_profil} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                  )}
                  <label className="absolute inset-0 w-full h-full cursor-pointer bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-white text-[10px] font-bold">Ubah</span>
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => e.target.files && setEditFotoFile(e.target.files[0])} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[12px] font-bold text-gray-700">Nama Lengkap</label>
                  <input type="text" name="nama_lengkap" required value={editFormData.nama_lengkap} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-700">Alamat Email</label>
                  <input type="email" name="email" required value={editFormData.email} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-700">Username</label>
                  <input type="text" name="username" required value={editFormData.username} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-700">Nomor WhatsApp</label>
                  <input type="text" name="no_whatsapp" required value={editFormData.no_whatsapp} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] font-bold text-gray-700">Role</label>
                  <select name="role" value={editFormData.role} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black bg-white appearance-none">
                    <option value="Technician (Lapangan)">Technician (Lapangan)</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <svg className="absolute right-3 top-[30px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div className="space-y-1.5 relative md:col-span-2 bg-blue-50/30 p-3 rounded-[8px] border border-blue-100">
                  <label className="text-[12px] font-bold text-blue-900">Ganti Password <span className="text-gray-500 font-normal">(Kosongkan jika tidak ingin ganti)</span></label>
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="Ketik password baru di sini..." value={editFormData.password} onChange={handleEditChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-blue-500 mt-1 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-gray-400 hover:text-black">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                <button type="button" onClick={triggerDelete} className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-[8px] hover:bg-red-100 transition-colors flex items-center gap-2 w-full sm:w-auto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Hapus Teknisi
                </button>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors">Batal</button>
                  <button type="submit" className="px-5 py-2.5 text-[12px] font-bold text-white bg-black rounded-[8px] hover:bg-gray-800 transition-colors">Simpan Perubahan</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOTIFIKASI */}
      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {submitModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-200"><svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Gagal Disimpan</h3>
                <p className="text-[13px] text-gray-500 mb-8">{submitModal.message}</p>
                <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="w-full px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors">Tutup & Perbaiki</button>
              </>
            ) : submitModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900">Perubahan Disimpan!</h3>
              </div>
            ) : submitModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Menyimpan Data...</h3>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100"><svg className="w-8 h-8 text-[#2D68FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Perubahan?</h3>
                <p className="text-[13px] text-gray-500 mb-8">Apakah Anda yakin data kelengkapan teknisi ini sudah benar?</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full">Batal</button>
                  <button onClick={executeEdit} className="px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors w-full">Ya, Simpan</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {deleteModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900">Masuk Tempat Sampah!</h3>
              </div>
            ) : deleteModal.status === "deleting" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Memproses Data...</h3>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Hapus Teknisi?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">Yakin ingin menyembunyikan <strong>"{deleteModal.nama}"</strong> ke tempat sampah? Histori kerjanya tidak akan hilang.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full">Batal</button>
                  <button onClick={executeDelete} className="px-6 py-2.5 text-[13px] font-bold text-white bg-red-600 rounded-[10px] hover:bg-red-700 transition-colors w-full">Ya, Hapus</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}