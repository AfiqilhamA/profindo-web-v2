"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase"; 
import { Html5Qrcode } from "html5-qrcode"; // Ganti pakai ini biar UI kameranya bisa dicustom

export default function TechnicianPage() {
  const router = useRouter();
  
  // State User
  const [techName, setTechName] = useState("Technician");
  
  // State Alur Aplikasi
  const [appState, setAppState] = useState<"idle" | "scanning_live" | "scanning_upload" | "form">("idle");
  
  // State Modals
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); 
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false); 
  const [isSuccessOpen, setIsSuccessOpen] = useState(false); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Data Mesin & Form
  const [scannedId, setScannedId] = useState("");
  const [machineData, setMachineData] = useState<any>(null);
  const [detailPekerjaan, setDetailPekerjaan] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push("/login");
      const { data: profile } = await supabase.from("technicians").select("nama_lengkap").eq("email", user.email ?? "").maybeSingle();
      if (profile) setTechName(profile.nama_lengkap);
    });
  }, [router]);

  // ==========================================
  // LOGIKA LIVE KAMERA (BCA MOBILE STYLE)
  // ==========================================
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    if (appState === "scanning_live") {
      scanner = new Html5Qrcode("qr-reader");

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scanner && scanner.isScanning) {
            scanner.stop().then(() => {
              setScannedId(decodedText);
              setAppState("idle");
              setIsModalOpen(true);
            }).catch(console.error);
          }
        },
        (errorMessage) => {
          // Abaikan error saat proses nyari QR
        }
      ).catch(err => {
        alert("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        setAppState("idle");
      });
    }

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [appState]);

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ==========================================
  // LOGIKA UPLOAD QR (BACA GAMBAR BENERAN)
  // ==========================================
  const handleUploadQRClick = () => {
    fileInputRef.current?.click();
  };

  const handleQRFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAppState("scanning_upload");

      try {
        const html5QrCode = new Html5Qrcode("reader-hidden");
        const decodedText = await html5QrCode.scanFile(file, true);

        setScannedId(decodedText); 
        setAppState("idle");
        setIsModalOpen(true); 
      } catch (err) {
        alert("QR Code tidak terbaca. Pastikan foto tidak blur dan jelas.");
        setAppState("idle");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const processScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedId) {
      alert("Ketik Product ID mesinnya dulu ya!");
      return;
    }

    setIsModalOpen(false);
    setAppState("scanning_upload"); 

    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .eq("product_id", scannedId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error || !data) {
      alert("Waduh, Mesin tidak ditemukan di database!");
      setAppState("idle");
    } else {
      setMachineData(data);
      setTimeout(() => setAppState("form"), 500); 
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(e.target.files[0]);
    }
  };

  // ==========================================
  // ALUR KIRIM LAPORAN (POP UP 2X KONFIRMASI)
  // ==========================================
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailPekerjaan) {
      alert("Harap isi detail pekerjaan!");
      return;
    }
    setIsSubmitConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setIsSubmitConfirmOpen(false);
    setIsSubmitting(true);

    try {
      let fotoUrl = null;

      if (foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `dokumentasi-${Date.now()}.${fileExt}`;
        const { data: uploadData } = await supabase.storage.from('machine_files').upload(`dokumentasi/${fileName}`, foto);
        
        if (uploadData) {
          const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`dokumentasi/${fileName}`);
          fotoUrl = publicUrlData.publicUrl;
        }
      }

      const { error: serviceError } = await supabase.from("machine_services").insert([{
        machine_id: machineData.id,
        tanggal: new Date().toISOString().split('T')[0],
        judul_service: "Servis Lapangan",
        detail_pekerjaan: detailPekerjaan,
        pic: techName, 
        foto_dokumentasi: fotoUrl
      }]);

      if (serviceError) throw serviceError;

      await supabase.from("activity_logs").insert([{
        actor_name: techName,
        action_text: `menyelesaikan laporan servis untuk mesin ${machineData.nama_mesin} (${machineData.product_id})`,
        tipe_aktivitas: "Work Order"
      }]);

      setIsSuccessOpen(true);

    } catch (err: any) {
      alert("Gagal mengirim laporan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    setIsSuccessOpen(false);
    setAppState("idle");
    setScannedId("");
    setDetailPekerjaan("");
    setFoto(null);
    setMachineData(null);
  };

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#Eef1F4] flex justify-center relative">
      {/* ELEMEN TERSEMBUNYI BUAT BACA FILE GAMBAR */}
      <div id="reader-hidden" className="hidden"></div>

      <div className="w-full max-w-md bg-[#Eef1F4] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* ======================================= */}
        {/* HEADER */}
        {/* ======================================= */}
        <div className="bg-[#0A1128] pt-12 pb-24 px-8 rounded-b-[40px] relative shrink-0">
          
          {appState === "form" && (
            <button 
              onClick={() => { setAppState("idle"); setMachineData(null); }} 
              className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              Kembali
            </button>
          )}

          <button onClick={() => setIsLogoutModalOpen(true)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Keluar
          </button>

          <p className="text-gray-400 text-[10px] font-medium text-right mb-6">{today}</p>
          <h1 className="text-white text-3xl font-serif font-bold tracking-wide">Field Service</h1>
          <p className="text-[#E63946] text-sm font-bold mt-1 tracking-wide">Profindo Technician</p>
          
          {appState === "idle" && (
            <p className="text-gray-300 text-[11px] mt-6 leading-relaxed max-w-[250px]">
              Silahkan Scan Live atau Upload QR Code dari mesin yang ingin di servis
            </p>
          )}
        </div>

        {/* ======================================= */}
        {/* KONTEN UTAMA */}
        {/* ======================================= */}
        <div className="flex-1 px-6 -mt-16 relative z-10 pb-10">
          
          {/* MENU AWAL */}
          {appState === "idle" && (
            <div className="bg-white rounded-[24px] shadow-lg p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
              
              <button 
                onClick={() => setAppState("scanning_live")}
                className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white rounded-[14px] py-4 flex items-center justify-center gap-2 font-bold text-sm transition-transform active:scale-95 shadow-md shadow-blue-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Scan Live QR
              </button>
              
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleQRFileChange} className="hidden" />
              
              <button 
                onClick={handleUploadQRClick}
                className="w-full bg-[#F0F4FF] text-[#3B82F6] border border-[#Dbeafe] rounded-[14px] py-4 flex items-center justify-center gap-2 font-bold text-sm transition-transform active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Upload Foto QR
              </button>
            </div>
          )}

          {/* AREA KAMERA SCANNER */}
          {appState === "scanning_live" && (
            <div className="bg-white rounded-[24px] shadow-lg p-4 flex flex-col items-center gap-4 animate-in fade-in duration-300">
              <h3 className="text-[14px] font-bold text-gray-800">Arahkan Kamera ke QR Code</h3>
              {/* Kotak ini otomatis diisi video kamera sama library html5-qrcode */}
              <div id="qr-reader" className="w-full rounded-[16px] overflow-hidden border-2 border-dashed border-blue-400"></div>
              
              <button 
                onClick={() => setAppState("idle")} 
                className="w-full py-3 mt-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-[12px] font-bold text-[13px] transition-colors"
              >
                Batal Scan
              </button>
            </div>
          )}

          {/* LOADING UPLOAD QR */}
          {appState === "scanning_upload" && (
            <div className="bg-white rounded-[24px] shadow-lg p-10 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-lg"></div>
                <div className="absolute inset-0 border-4 border-[#3B82F6] rounded-lg border-t-transparent animate-spin"></div>
              </div>
              <p className="text-[13px] font-bold text-gray-600 animate-pulse mt-2">Memproses Data...</p>
            </div>
          )}

          {/* FORM LAPORAN SERVIS */}
          {appState === "form" && machineData && (
            <form onSubmit={handleSubmitClick} className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-white rounded-[24px] shadow-lg p-6">
                <div className="mb-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nama Mesin</p>
                  <p className="text-[16px] font-bold text-gray-900">{machineData.nama_mesin}</p>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Product ID</p>
                    <p className="text-[13px] font-bold text-gray-800">{machineData.product_id}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Serial Number</p>
                    <p className="text-[13px] font-bold text-gray-800">{machineData.serial_number || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-bold text-[#0A1128] mb-3 ml-1">Detail Pekerjaan</h3>
                  <textarea 
                    rows={4}
                    value={detailPekerjaan}
                    onChange={(e) => setDetailPekerjaan(e.target.value)}
                    placeholder="Jelaskan komponen yang diganti atau diperbaiki..."
                    className="w-full bg-white border border-gray-200 rounded-[16px] p-4 text-[13px] text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm"
                    required
                  ></textarea>
                </div>

                <div>
                  <h3 className="text-[13px] font-bold text-[#0A1128] mb-3 ml-1">Dokumentasi</h3>
                  {foto ? (
                    <div className="relative w-full h-40 rounded-[16px] border-2 border-dashed border-[#3B82F6] overflow-hidden group mb-3 shadow-sm">
                      <img src={URL.createObjectURL(foto)} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <label className="w-full bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-[16px] py-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                        <svg className="w-7 h-7 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span className="text-[13px] font-bold text-[#3B82F6]">Buka Camera</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
                      </label>
                      <label className="w-full bg-white border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-[16px] py-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                        <svg className="w-7 h-7 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h14V7H5zm2 2h2v2H7V9zm4 0h6v2h-6V9zm-4 4h2v2H7v-2zm4 0h6v2h-6v-2z"></path></svg>
                        <span className="text-[13px] font-bold text-gray-600">Pilih dari Galeri</span>
                        <input type="file" accept="image/png, image/jpeg" onChange={handleFotoChange} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-4 w-full bg-[#00C2FF] hover:bg-cyan-500 text-white rounded-full py-4 font-bold text-[14px] shadow-lg shadow-cyan-500/30 transition-transform flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70' : 'active:scale-95'}`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Menyimpan...
                    </>
                  ) : "Kirim Laporan Servis"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL HASIL SCAN */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Data QR Code</h3>
            <p className="text-[12px] text-gray-500 mb-5">Silahkan konfirmasi atau masukkan Product ID mesin.</p>
            <form onSubmit={processScan}>
              <input 
                type="text" 
                placeholder="Contoh: PFD-23772938"
                value={scannedId}
                onChange={(e) => setScannedId(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[13px] font-bold outline-none focus:border-[#3B82F6] transition-colors mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:bg-gray-100 rounded-[8px] transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 text-[12px] font-bold text-white bg-[#3B82F6] hover:bg-blue-600 rounded-[8px] shadow-sm transition-colors">
                  Proses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 1: KONFIRMASI SEBELUM KIRIM */}
      {/* ========================================= */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Kirim Laporan?</h3>
            <p className="text-[12px] text-gray-500 mb-6">Pastikan detail pekerjaan dan dokumentasi foto sudah benar.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsSubmitConfirmOpen(false)} className="flex-1 py-3 text-[12px] font-bold text-gray-600 bg-gray-100 rounded-[12px] hover:bg-gray-200 transition-colors">
                Periksa Lagi
              </button>
              <button onClick={executeSubmit} className="flex-1 py-3 text-[12px] font-bold text-white bg-[#3B82F6] rounded-[12px] hover:bg-blue-700 transition-colors">
                Ya, Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: SUKSES TERKIRIM */}
      {/* ========================================= */}
      {isSuccessOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Berhasil!</h3>
            <p className="text-[12px] text-gray-500 mb-6">Laporan servis berhasil dikirim dan dicatat ke Database.</p>
            <button onClick={closeSuccessModal} className="w-full py-3 text-[12px] font-bold text-white bg-green-500 rounded-[12px] hover:bg-green-600 transition-colors">
              Oke, Selesai
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL LOGOUT */}
      {/* ========================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Akhiri Sesi?</h3>
            <p className="text-[12px] text-gray-500 mb-6">Anda akan keluar dari Portal Teknisi.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 text-[12px] font-bold text-gray-600 bg-gray-100 rounded-[12px] hover:bg-gray-200 transition-colors">
                Batal
              </button>
              <button onClick={confirmLogout} className="flex-1 py-3 text-[12px] font-bold text-white bg-[#E11D48] rounded-[12px] hover:bg-rose-700 transition-colors">
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}