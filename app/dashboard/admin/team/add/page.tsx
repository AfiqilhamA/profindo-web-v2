"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../utils/supabase";

export default function AddTeamPage() {
  const router = useRouter();

  // State untuk Data Teks (TANPA PASSWORD)
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    email: "",
    username: "",
    no_whatsapp: "",
    role: "Technician (Lapangan)"
  });

  // State untuk Foto Profil
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  // --- STATE UNTUK CUSTOM MODAL ---
  const [submitModal, setSubmitModal] = useState<{
    isOpen: boolean;
    status: "confirm" | "saving" | "success" | "error";
    message?: string;
  }>({
    isOpen: false,
    status: "confirm"
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoFile(e.target.files[0]);
    }
  };

  // --- FUNGSI 1: CEGAT SUBMIT BUAT VALIDASI & MUNCULIN KONFIRMASI ---
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi 1: Cek Email harus pakai @
    if (!formData.email.includes("@")) {
      setSubmitModal({ 
        isOpen: true, 
        status: "error", 
        message: "Format email tidak valid! Pastikan alamat email menggunakan karakter '@'." 
      });
      return;
    }

    // Kalau lolos semua validasi, munculin Pop-up Konfirmasi
    setSubmitModal({ isOpen: true, status: "confirm" });
  };

  // --- FUNGSI 2: EKSEKUSI DATA KE SUPABASE ---
  const executeSubmit = async () => {
    setSubmitModal({ isOpen: true, status: "saving" });
    let fotoUrl = null;

    // 1. Upload Foto ke Supabase Storage
    if (fotoFile) {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('machine_files')
        .upload(`profiles/${fileName}`, fotoFile);
        
      if (uploadError) {
        setSubmitModal({ 
          isOpen: true, 
          status: "error", 
          message: "Gagal mengupload foto profil: " + uploadError.message 
        });
        return; 
      }

      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`profiles/${fileName}`);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    // 2. Simpan Data ke Tabel 'technicians' (TANPA PASSWORD)
    const { error } = await supabase
      .from("technicians")
      .insert([
        {
          nama_lengkap: formData.nama_lengkap,
          email: formData.email,
          username: formData.username,
          no_whatsapp: formData.no_whatsapp,
          role: formData.role,
          foto_profil: fotoUrl,
        }
      ]);

    if (error) {
      setSubmitModal({ 
        isOpen: true, 
        status: "error", 
        message: "Gagal menambahkan teknisi ke database: " + error.message 
      });
    } else {
      setSubmitModal({ isOpen: true, status: "success" });
      setTimeout(() => {
        router.push("/dashboard/admin/team"); 
      }, 1500);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full relative"> 
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Tambah Anggota Tim</h1>
          <p className="text-[12px] text-gray-500 mt-1">Daftarkan profil teknisi/admin baru ke dalam sistem.</p>
        </div>
      </div>

      <form onSubmit={handleSubmitClick} className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-6 sm:p-8">
        
        <h2 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-3 mb-8">Informasi Profil</h2>
        
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group shadow-sm">
            {fotoFile ? (
              <img src={URL.createObjectURL(fotoFile)} alt="Preview Profil" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
            )}
            
            <label className="absolute inset-0 w-full h-full cursor-pointer bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="text-white text-[10px] font-bold">Ubah Foto</span>
              <input type="file" accept="image/png, image/jpeg" onChange={handleFotoChange} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] font-semibold text-gray-400 mt-3">Upload Foto Profil (Rasio 1:1)</p>
        </div>

        <div className="space-y-6">
          
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-gray-700">Nama Lengkap</label>
            <input type="text" name="nama_lengkap" required value={formData.nama_lengkap} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Alamat Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Username</label>
              <input type="text" name="username" required value={formData.username} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Nomor WhatsApp</label>
              <input type="text" name="no_whatsapp" required value={formData.no_whatsapp} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black transition-colors" />
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[12px] font-bold text-gray-700">Role</label>
              <select name="role" value={formData.role} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black transition-colors appearance-none bg-white">
                <option value="Technician (Lapangan)">Technician (Lapangan)</option>
                <option value="Admin">Admin</option>
              </select>
              <svg className="absolute right-3 top-[34px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-[10px] p-4 flex items-start gap-3 mt-4">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <p className="text-[13px] font-bold text-blue-900 mb-1">Informasi Login</p>
              <p className="text-[12px] text-blue-700 leading-relaxed">
                Kata sandi (password) tidak lagi diatur oleh Admin demi keamanan. Anggota tim baru yang ditambahkan di sini harus membuat password mereka sendiri menggunakan fitur <b>"Sign Up"</b> atau fitur <b>"Lupa Password"</b> di halaman Login dengan email yang sama.
              </p>
            </div>
          </div>

        </div>

        <div className="mt-8 flex justify-end">
          <button 
            type="submit"
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-[10px] text-[13px] font-bold transition-all active:scale-95 shadow-md"
          >
            Simpan Profil Tim
          </button>
        </div>
      </form>

      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            
            {submitModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-200">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Pengecekan Gagal</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
                  {submitModal.message}
                </p>
                <button 
                  onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} 
                  className="w-full px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors"
                >
                  Tutup & Perbaiki
                </button>
              </>
            ) : submitModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil Ditambahkan!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Data anggota tim telah tersimpan ke sistem.</p>
              </div>
            ) : submitModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Menyimpan Data...</h3>
                <p className="text-[12px] text-gray-500 mt-1">Harap tunggu sebentar.</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100">
                  <svg className="w-8 h-8 text-[#2D68FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                </div>
                
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Profil Tim?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
                  Apakah Anda yakin data kelengkapan profil ini sudah diisi dengan benar?
                </p>
                
                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} 
                    className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeSubmit} 
                    className="px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors w-full"
                  >
                    Ya, Simpan
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