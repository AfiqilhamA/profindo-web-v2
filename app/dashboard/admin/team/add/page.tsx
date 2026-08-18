"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../utils/supabase";

export default function AddTeamPage() {
  const router = useRouter();

  // KOTAK PASSWORD KEMBALI HADIR DI SINI
  const [formData, setFormData] = useState({
    nama_lengkap: "", 
    email: "", 
    username: "", 
    no_whatsapp: "", 
    role: "Technician (Lapangan)", 
    password: "", 
    confirm_password: ""
  });

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitModal, setSubmitModal] = useState<{ isOpen: boolean; status: "confirm" | "saving" | "success" | "error"; message?: string; }>({ isOpen: false, status: "confirm" });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFotoFile(e.target.files[0]);
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.includes("@")) return setSubmitModal({ isOpen: true, status: "error", message: "Format email tidak valid!" });
    if (formData.password !== formData.confirm_password) return setSubmitModal({ isOpen: true, status: "error", message: "Password dan Confirm Password tidak cocok!" });
    if (formData.password.length < 6) return setSubmitModal({ isOpen: true, status: "error", message: "Password minimal 6 karakter!" });
    setSubmitModal({ isOpen: true, status: "confirm" });
  };

  const executeSubmit = async () => {
    setSubmitModal({ isOpen: true, status: "saving" });
    let fotoUrl = null;

    // 1. Upload Foto dulu (kalau ada)
    if (fotoFile) {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('machine_files').upload(`profiles/${fileName}`, fotoFile);
      if (uploadError) return setSubmitModal({ isOpen: true, status: "error", message: "Gagal upload foto: " + uploadError.message });
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`profiles/${fileName}`);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    // 2. PANGGIL JALUR VIP (API ROUTE) YANG TADI KAMU BIKIN
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nama_lengkap: formData.nama_lengkap,
          username: formData.username,
          no_whatsapp: formData.no_whatsapp,
          role: formData.role,
          fotoUrl: fotoUrl
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Gagal mendaftarkan teknisi");

      setSubmitModal({ isOpen: true, status: "success" });
      setTimeout(() => router.push("/dashboard/admin/team"), 1500);

    } catch (error: any) {
      setSubmitModal({ isOpen: true, status: "error", message: error.message });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full relative"> 
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50 transition-colors shadow-sm"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg></button>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Tambah Anggota Tim</h1>
          <p className="text-[12px] text-gray-500">Daftarkan profil dan buat password untuk teknisi baru.</p>
        </div>
      </div>

      <form onSubmit={handleSubmitClick} className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-6 sm:p-8">
        
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group shadow-sm">
            {fotoFile ? <img src={URL.createObjectURL(fotoFile)} alt="Preview Profil" className="w-full h-full object-cover" /> : <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>}
            <label className="absolute inset-0 w-full h-full cursor-pointer bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-[10px] font-bold mt-1">Ubah Foto</span>
              <input type="file" accept="image/png, image/jpeg" onChange={handleFotoChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-gray-700">Nama Lengkap</label>
            <input type="text" name="nama_lengkap" required value={formData.nama_lengkap} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[12px] font-bold text-gray-700">Email</label><input type="email" name="email" required value={formData.email} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" /></div>
            <div className="space-y-1.5"><label className="text-[12px] font-bold text-gray-700">Username</label><input type="text" name="username" required value={formData.username} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-[12px] font-bold text-gray-700">Nomor WA</label><input type="text" name="no_whatsapp" required value={formData.no_whatsapp} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" /></div>
            <div className="space-y-1.5 relative"><label className="text-[12px] font-bold text-gray-700">Role</label><select name="role" value={formData.role} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black appearance-none bg-white"><option value="Technician (Lapangan)">Technician (Lapangan)</option><option value="Admin">Admin</option></select></div>
          </div>

          {/* INPUT PASSWORD & CONFIRM PASSWORD MUNCUL LAGI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5 relative">
              <label className="text-[12px] font-bold text-gray-700">Password</label>
              <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-gray-400 hover:text-black">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[12px] font-bold text-gray-700">Confirm Password</label>
              <input type={showConfirmPassword ? "text" : "password"} name="confirm_password" required value={formData.confirm_password} onChange={handleTextChange} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-[34px] text-gray-400 hover:text-black">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button type="submit" className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-[10px] text-[13px] font-bold">Simpan Profil Tim</button>
        </div>
      </form>

      {/* Modal Notifikasi */}
      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center">
            {submitModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Gagal</h3>
                <p className="text-[13px] text-gray-500 mb-8">{submitModal.message}</p>
                <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="w-full px-6 py-2.5 text-white bg-black rounded-[10px]">Tutup</button>
              </>
            ) : submitModal.status === "success" ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Teknisi telah ditambahkan.</p>
              </>
            ) : submitModal.status === "saving" ? (
              <>
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Menyimpan...</h3>
              </>
            ) : (
              <>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Data?</h3>
                <div className="flex justify-center gap-3 mt-8">
                  <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="px-6 py-2.5 bg-gray-100 rounded-[10px] w-full">Batal</button>
                  <button onClick={executeSubmit} className="px-6 py-2.5 text-white bg-black rounded-[10px] w-full">Ya, Simpan</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}