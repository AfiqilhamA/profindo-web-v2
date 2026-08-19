"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import { Html5Qrcode } from "html5-qrcode";

export default function GuestPage() {
  const router = useRouter();

  // State Alur Aplikasi
  const [appState, setAppState] = useState<"idle" | "scanning_live" | "scanning_upload" | "result">("idle");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // State Modal & Preview
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, timestamp: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Data Database
  const [scannedId, setScannedId] = useState("");
  const [machineData, setMachineData] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);

  // ==========================================
  // LOGIKA LIVE KAMERA
  // ==========================================
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    if (appState === "scanning_live") {
      scanner = new Html5Qrcode("qr-reader-guest");

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
        (errorMessage) => {}
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

  // ==========================================
  // LOGIKA UPLOAD GAMBAR QR
  // ==========================================
  const handleUploadQRClick = () => fileInputRef.current?.click();

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

  // ==========================================
  // TARIK DATA RIWAYAT DARI DATABASE
  // ==========================================
  const processScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedId) {
      alert("Ketik Product ID mesinnya dulu ya!");
      return;
    }

    setIsModalOpen(false);
    setAppState("scanning_upload");

    try {
      const { data: machine, error: machineErr } = await supabase
        .from("machines")
        .select("*")
        .eq("product_id", scannedId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (machineErr || !machine) {
        alert("Mesin tidak ditemukan atau ID salah.");
        setAppState("idle");
        return;
      }

      const { data: history, error: historyErr } = await supabase
        .from("machine_services")
        .select("*")
        .eq("machine_id", machine.id)
        .order("tanggal", { ascending: false });

      setMachineData(machine);
      setServiceHistory(history || []);
      setTimeout(() => setAppState("result"), 500);

    } catch (err) {
      alert("Terjadi kesalahan sistem.");
      setAppState("idle");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // --- FUNGSI FORMAT TIMESTAMP CCTV ---
  const getTimestamp = (service: any) => {
    // Kalau ada created_at (jam aslinya masuk database), pakai itu
    if (service.created_at) {
      const date = new Date(service.created_at);
      return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
    // Fallback kalau cuma ada tanggal
    return formatDate(service.tanggal) + ' - Recorded';
  };

  // --- FUNGSI DOWNLOAD GAMBAR ---
  const downloadImage = async (imageUrl: string) => {
    try {
      // Ambil file sebagai Blob biar bisa dipaksa download
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dokumentasi_${machineData?.product_id}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Kalau gagal fetch Blob (CORS), buka di tab baru sebagai gantinya
      window.open(imageUrl, '_blank');
    }
  };

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleLogout = () => {
    document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#Eef1F4] flex justify-center relative">
      <div id="reader-hidden" className="hidden"></div>

      <div className="w-full max-w-md bg-[#Eef1F4] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="bg-[#0A1128] pt-12 pb-24 px-8 rounded-b-[40px] relative shrink-0">

          {appState === "result" && (
            <button onClick={() => { setAppState("idle"); setMachineData(null); setServiceHistory([]); }} className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg> Scan Ulang
            </button>
          )}

          <button onClick={handleLogout} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> Keluar
          </button>

          <p className="text-gray-400 text-[10px] font-medium text-right mb-6">{today}</p>
          <h1 className="text-white text-3xl font-serif font-bold tracking-wide">Portal Guest</h1>
          <p className="text-emerald-400 text-sm font-bold mt-1 tracking-wide">Informasi Riwayat Mesin</p>

          {appState === "idle" && (
            <p className="text-gray-300 text-[11px] mt-6 leading-relaxed max-w-[250px]">
              Silahkan Scan QR Code di mesin Anda untuk melihat detail riwayat pekerjaan.
            </p>
          )}
        </div>

        {/* KONTEN UTAMA */}
        <div className="flex-1 px-6 -mt-16 relative z-10 pb-10">

          {/* STATE 1: MENU IDLE */}
          {appState === "idle" && (
            <div className="bg-white rounded-[24px] shadow-lg p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setAppState("scanning_live")} className="w-full bg-[#10B981] hover:bg-emerald-600 text-white rounded-[14px] py-4 flex items-center justify-center gap-2 font-bold text-sm transition-transform active:scale-95 shadow-md shadow-emerald-500/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Scan Live QR
              </button>

              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleQRFileChange} className="hidden" />

              <button onClick={handleUploadQRClick} className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[14px] py-4 flex items-center justify-center gap-2 font-bold text-sm transition-transform active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Upload Foto QR
              </button>
            </div>
          )}

          {/* STATE 2: KAMERA / LOADING */}
          {appState === "scanning_live" && (
            <div className="bg-white rounded-[24px] shadow-lg p-4 flex flex-col items-center gap-4 animate-in fade-in duration-300">
              <h3 className="text-[14px] font-bold text-gray-800">Arahkan Kamera ke QR Code</h3>
              <div id="qr-reader-guest" className="w-full rounded-[16px] overflow-hidden border-2 border-dashed border-emerald-400"></div>
              <button onClick={() => setAppState("idle")} className="w-full py-3 mt-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-[12px] font-bold text-[13px] transition-colors">
                Batal Scan
              </button>
            </div>
          )}

          {appState === "scanning_upload" && (
            <div className="bg-white rounded-[24px] shadow-lg p-10 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-lg"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-lg border-t-transparent animate-spin"></div>
              </div>
              <p className="text-[13px] font-bold text-gray-600 animate-pulse mt-2">Membaca Data...</p>
            </div>
          )}

          {/* STATE 3: HASIL RIWAYAT SERVIS (READ-ONLY) */}
          {appState === "result" && machineData && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">

              {/* KARTU IDENTITAS MESIN */}
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

              {/* TABS SWITCHER: TIMELINE VS TABLE */}
              <div className="bg-white rounded-[20px] shadow-sm p-2 flex border border-gray-100">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`flex-1 py-2.5 text-[12px] font-bold rounded-[14px] transition-colors ${viewMode === "timeline" ? "bg-[#0A1128] text-white" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Timeline (Zigzag)
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex-1 py-2.5 text-[12px] font-bold rounded-[14px] transition-colors ${viewMode === "table" ? "bg-[#0A1128] text-white" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Tampilan Tabel
                </button>
              </div>

              {/* DATA RIWAYAT SERVIS */}
              <div className="bg-white rounded-[24px] shadow-lg p-6 min-h-[300px]">
                <h3 className="text-[14px] font-bold text-gray-900 mb-6">Riwayat Pengerjaan</h3>

                {serviceHistory.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[13px] text-gray-400 font-medium">Belum ada riwayat servis untuk mesin ini.</p>
                  </div>
                ) : (
                  <>
                    {/* TAMPILAN TIMELINE (ZIGZAG VERTIKAL) */}
                    {viewMode === "timeline" && (
                      <div className="relative border-l-2 border-gray-100 ml-2 space-y-8 pb-4">
                        {serviceHistory.map((service) => (
                          <div key={service.id} className="relative pl-6">
                            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>

                            <p className="text-[11px] font-bold text-emerald-600 mb-1">{formatDate(service.tanggal)}</p>
                            <h4 className="text-[13px] font-bold text-gray-900 mb-1">{service.judul_service || "Servis Reguler"}</h4>
                            <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{service.detail_pekerjaan}</p>

                            <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold">
                                {service.pic?.substring(0, 2).toUpperCase() || "TK"}
                              </div>
                              <span className="text-[10px] font-bold text-gray-600">Teknisi: {service.pic || "Tidak diketahui"}</span>
                            </div>

                            {/* --- FOTO DENGAN TIMESTAMP & KLIK PREVIEW --- */}
                            {service.foto_dokumentasi && (
                              <div 
                                onClick={() => setPreviewImage({ url: service.foto_dokumentasi, timestamp: getTimestamp(service) })}
                                className="mt-4 relative rounded-[12px] overflow-hidden border border-gray-200 cursor-pointer group shadow-sm hover:shadow-md transition-all"
                              >
                                <img src={service.foto_dokumentasi} alt="Dokumentasi" className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                                
                                {/* Overlay Gelap Hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                  <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100 duration-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                                  </div>
                                </div>
                                
                                {/* Timestamp ala CCTV */}
                                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]"></span>
                                  {getTimestamp(service)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TAMPILAN TABEL */}
                    {viewMode === "table" && (
                      <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-left min-w-[400px]">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="pb-3 px-2 text-[10px] font-bold text-gray-400 uppercase">Tanggal</th>
                              <th className="pb-3 px-2 text-[10px] font-bold text-gray-400 uppercase">Pekerjaan</th>
                              <th className="pb-3 px-2 text-[10px] font-bold text-gray-400 uppercase">Teknisi (PIC)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {serviceHistory.map((service) => (
                              <tr key={service.id} className="hover:bg-gray-50/50">
                                <td className="py-4 px-2 text-[11px] font-medium text-gray-600 whitespace-nowrap">
                                  {formatDate(service.tanggal)}
                                </td>
                                <td className="py-4 px-2">
                                  <p className="text-[12px] font-bold text-gray-800 line-clamp-1">{service.judul_service || "Servis Reguler"}</p>
                                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{service.detail_pekerjaan}</p>
                                </td>
                                <td className="py-4 px-2 text-[11px] font-bold text-gray-700">
                                  {service.pic || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL HASIL SCAN */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Cek Riwayat Mesin</h3>
            <p className="text-[12px] text-gray-500 mb-5">Silahkan konfirmasi atau masukkan Product ID mesin.</p>
            <form onSubmit={processScan}>
              <input type="text" placeholder="Contoh: PFD-23772938" value={scannedId} onChange={(e) => setScannedId(e.target.value)} autoFocus className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[13px] font-bold outline-none focus:border-emerald-500 transition-colors mb-6" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[12px] font-bold text-gray-500 hover:bg-gray-100 rounded-[8px] transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 text-[12px] font-bold text-white bg-[#10B981] hover:bg-emerald-600 rounded-[8px] shadow-sm transition-colors">Cari Riwayat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL POP-UP PREVIEW GAMBAR & DOWNLOAD */}
      {/* ========================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          
          <button 
            onClick={() => setPreviewImage(null)} 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="w-full max-w-lg px-4 flex flex-col items-center">
            <div className="relative w-full overflow-hidden rounded-[16px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
              <img src={previewImage.url} alt="Preview Bukti Servis" className="w-full h-auto max-h-[70vh] object-contain bg-black" />
              
              {/* Timestamp CCTV besar di Preview */}
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-[8px] text-[13px] font-mono text-white flex items-center gap-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,1)]"></span>
                {previewImage.timestamp}
              </div>
            </div>

            <button 
              onClick={() => downloadImage(previewImage.url)}
              className="mt-8 flex items-center gap-2 bg-[#10B981] hover:bg-emerald-500 text-white px-8 py-3.5 rounded-full font-bold text-[14px] transition-transform active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download Foto Bukti
            </button>
          </div>
        </div>
      )}

    </div>
  );
}