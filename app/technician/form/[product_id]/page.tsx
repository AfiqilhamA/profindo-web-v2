"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../utils/supabase";

export default function TechnicianFormPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.product_id as string;

  const [techName, setTechName] = useState("");
  const [machine, setMachine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [detailPekerjaan, setDetailPekerjaan] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchMachine = async () => {
      const decodedId = decodeURIComponent(productId);
      const { data } = await supabase
        .from("machines")
        .select("*")
        .ilike("product_id", decodedId)
        .single();

      if (data) setMachine(data);
      setIsLoading(false);
    };
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push("/login");
      const { data: profile } = await supabase.from("technicians").select("nama_lengkap").eq("email", user.email ?? "").maybeSingle();
      if (profile) setTechName(profile.nama_lengkap);
      fetchMachine();
    });
  }, [productId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return alert("Mesin tidak ditemukan!");
    if (!detailPekerjaan) return alert("Detail pekerjaan harus diisi!");
    if (!fotoFile) return alert("Wajib melampirkan foto dokumentasi!");

    setIsSubmitting(true);
    let fotoUrl = null;

    const fileExt = fotoFile.name.split('.').pop();
    const fileName = `dokumentasi-${Date.now()}.${fileExt}`;
    
    const { data: uploadData } = await supabase.storage
      .from('machine_files')
      .upload(`dokumentasi/${fileName}`, fotoFile);
      
    if (uploadData) {
      const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`dokumentasi/${fileName}`);
      fotoUrl = publicUrlData.publicUrl;
    }

    // KIRIM NAMA TEKNISI KE DATABASE (Kolom pic)
    const { error } = await supabase.from("machine_services").insert([{
      machine_id: machine.id,
      tanggal: new Date().toISOString().split('T')[0],
      judul_service: "Servis Lapangan",
      detail_pekerjaan: detailPekerjaan,
      pic: techName, 
      foto_dokumentasi: fotoUrl
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Gagal mengirim laporan: " + error.message);
    } else {
      alert("Laporan Servis Berhasil Dikirim!");
      router.push("/technician");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#Eef2f5]">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#Eef2f5] font-sans pb-10">
      
      {/* HEADER NAVY (Z-index disesuaikan biar gak niban) */}
      <div className="bg-[#0b162c] pt-12 pb-24 px-8 rounded-b-[40px] relative shadow-lg z-0">
        <p className="text-right text-gray-400 text-[11px] mb-8">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-white text-[32px] font-serif font-bold tracking-wide">Field Service</h1>
        <p className="text-[#FF3B30] text-[15px] font-bold mt-1">Welcome, {techName}</p>
      </div>

      {/* FORM AREA (Ditambahin relative z-10 biar naik ke atas) */}
      <form onSubmit={handleSubmit} className="px-6 -mt-16 relative z-10 space-y-6 max-w-lg mx-auto">
        
        <div className="bg-white rounded-[20px] p-6 shadow-md">
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Nama Mesin</p>
            <p className="text-[16px] font-bold text-gray-900">{machine?.nama_mesin || "Tidak Ditemukan"}</p>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Product ID</p>
              <p className="text-[13px] font-bold text-gray-900">{machine?.product_id || "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Serial Number</p>
              <p className="text-[13px] font-bold text-gray-900">{machine?.serial_number || "-"}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[14px] font-bold text-gray-800 mb-3 ml-2">Detail Pekerjaan</h2>
          <textarea 
            rows={4}
            placeholder="Jelaskan komponen yang diganti atau diperbaiki..."
            value={detailPekerjaan}
            onChange={(e) => setDetailPekerjaan(e.target.value)}
            className="w-full bg-white rounded-[20px] p-5 text-[13px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
          ></textarea>
        </div>

        <div>
          <h2 className="text-[14px] font-bold text-gray-800 mb-3 ml-2 flex items-center justify-between">
            Dokumentasi
            {fotoFile && <span className="text-[11px] text-green-600 bg-green-100 px-2 py-1 rounded-md">1 Foto Siap</span>}
          </h2>
          
          <div className="space-y-3">
            <label className="w-full bg-white border-2 border-dashed border-blue-200 rounded-[20px] py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors shadow-sm">
              <svg className="w-8 h-8 text-[#2D68FF] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="text-[14px] font-bold text-[#2D68FF]">Buka Camera</span>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files && setFotoFile(e.target.files[0])} className="hidden" />
            </label>

            <label className="w-full bg-white border-2 border-dashed border-gray-300 rounded-[20px] py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></svg>
              <span className="text-[14px] font-bold text-gray-700">Pilih dari Galeri</span>
              <input type="file" accept="image/*" onChange={(e) => e.target.files && setFotoFile(e.target.files[0])} className="hidden" />
            </label>
          </div>
        </div>

        <div className="pt-6">
          <button 
            type="submit"
            disabled={isSubmitting || !machine}
            className={`w-full bg-[#00A8FF] hover:bg-blue-500 text-white font-bold py-4 rounded-full text-[14px] shadow-lg transition-all active:scale-95 ${isSubmitting ? 'opacity-70' : ''}`}
          >
            {isSubmitting ? "Mengirim Laporan..." : "Kirim Laporan Servis"}
          </button>
        </div>

      </form>
    </div>
  );
}