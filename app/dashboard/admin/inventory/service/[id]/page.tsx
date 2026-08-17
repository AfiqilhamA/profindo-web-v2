"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../../../utils/supabase";
import * as XLSX from "xlsx"; 

export default function ServiceHistoryPage() {
  const router = useRouter();
  const params = useParams(); 
  const machineId = params.id;

  const [machine, setMachine] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedService, setSelectedService] = useState<any>(null);

  const [formData, setFormData] = useState({
    tanggal: "",
    judul_service: "",
    detail_pekerjaan: "",
    pic: ""
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [submitModal, setSubmitModal] = useState<{isOpen: boolean, status: "confirm" | "saving" | "success" | "error", message?: string}>({ isOpen: false, status: "confirm" });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", judul: "", status: "idle" as "idle" | "deleting" | "success" });

  useEffect(() => {
    if (machineId) fetchData();
  }, [machineId]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: machineData } = await supabase.from("machines").select("*").eq("id", machineId).eq("is_deleted", false).single();
    if (machineData) setMachine(machineData);

    const { data: serviceData } = await supabase.from("machine_services").select("*").eq("machine_id", machineId).order("tanggal", { ascending: true });
    setServices(serviceData || []);
    setIsLoading(false);
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const serviceDate = s.tanggal; 
      const start = startDate || "0000-01-01"; 
      const end = endDate || "9999-12-31";     
      return serviceDate >= start && serviceDate <= end;
    });
  }, [services, startDate, endDate]);

  // ==========================================
  // FUNGSI EXPORT EXCEL (YANG UDAH DIRAPIHIN)
  // ==========================================
  const handleExportExcel = () => {
    if (filteredServices.length === 0) {
      alert("Tidak ada data untuk diexport pada rentang tanggal ini.");
      return;
    }

    const dataToExport = filteredServices.map(s => ({
      "Tanggal Service": s.tanggal,
      "Judul / Jenis Pekerjaan": s.judul_service,
      "Detail Pekerjaan": s.detail_pekerjaan || "-",
      "Penanggung Jawab (PIC)": s.pic,
      "Link Foto Bukti": s.foto_dokumentasi || "Tidak ada foto"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // --- FITUR BARU: ATUR LEBAR KOLOM EXCEL BIAR RAPI ---
    worksheet["!cols"] = [
      { wch: 18 }, // A: Lebar untuk Tanggal Service
      { wch: 35 }, // B: Lebar untuk Judul Pekerjaan
      { wch: 50 }, // C: Lebar untuk Detail Pekerjaan (panjang)
      { wch: 25 }, // D: Lebar untuk PIC
      { wch: 70 }  // E: Lebar untuk Link Foto (biar muat link Supabase)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Service");
    
    const fileName = `Riwayat_Service_${machine?.nama_mesin || "Mesin"}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleOpenAddModal = () => {
    setModalMode("add");
    setSelectedService(null);
    setFormData({ tanggal: "", judul_service: "", detail_pekerjaan: "", pic: "" });
    setFotoFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: any) => {
    setModalMode("edit");
    setSelectedService(service);
    setFormData({
      tanggal: service.tanggal || "",
      judul_service: service.judul_service || "",
      detail_pekerjaan: service.detail_pekerjaan || "",
      pic: service.pic || ""
    });
    setFotoFile(null);
    setIsModalOpen(true);
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitModal({ isOpen: true, status: "confirm" });
  };

  const executeSubmit = async () => {
    setSubmitModal({ isOpen: true, status: "saving" });
    
    let fotoUrl = modalMode === "edit" ? selectedService.foto_dokumentasi : null;

    if (fotoFile) {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `dokumentasi-${Date.now()}.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from('machine_files').upload(`dokumentasi/${fileName}`, fotoFile);
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`dokumentasi/${fileName}`);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    let error;

    if (modalMode === "add") {
      const { error: insertError } = await supabase.from("machine_services").insert([{
        machine_id: machineId, 
        tanggal: formData.tanggal, 
        judul_service: formData.judul_service, 
        detail_pekerjaan: formData.detail_pekerjaan,
        pic: formData.pic,
        foto_dokumentasi: fotoUrl
      }]);
      error = insertError;
    } else {
      const { error: updateError } = await supabase.from("machine_services").update({
        tanggal: formData.tanggal, 
        judul_service: formData.judul_service, 
        detail_pekerjaan: formData.detail_pekerjaan,
        pic: formData.pic,
        foto_dokumentasi: fotoUrl
      }).eq("id", selectedService.id);
      error = updateError;
    }

    if (error) {
      setSubmitModal({ isOpen: true, status: "error", message: error.message });
    } else {
      setSubmitModal({ isOpen: true, status: "success" });
      setTimeout(() => {
        setSubmitModal({ isOpen: false, status: "confirm" });
        setIsModalOpen(false); 
        fetchData(); 
      }, 1500);
    }
  };

  const triggerDelete = (historyId: string, judul: string) => {
    setDeleteModal({ isOpen: true, id: historyId, judul: judul, status: "idle" });
  };

  const executeDelete = async () => {
    setDeleteModal({ ...deleteModal, status: "deleting" });
    const { error } = await supabase.from("machine_services").delete().eq("id", deleteModal.id);
    
    if (error) {
      alert("Gagal menghapus data: " + error.message);
      setDeleteModal({ isOpen: false, id: "", judul: "", status: "idle" });
    } else {
      setDeleteModal({ ...deleteModal, status: "success" });
      setTimeout(() => {
        setDeleteModal({ isOpen: false, id: "", judul: "", status: "idle" });
        setIsModalOpen(false); 
        fetchData(); 
      }, 1500);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full max-w-4xl mx-auto relative">
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Riwayat Service Mesin</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Memuat data...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm mb-6">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-[24px] font-bold text-gray-900">{machine?.nama_mesin || "Loading..."}</h2>
              <p className="text-[12px] font-bold text-gray-500 mt-1">Product Id : <span className="text-gray-900">{machine?.product_id || "-"}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleOpenAddModal} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                Catat Servis Baru
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100">
            <div onClick={() => setIsWaOpen(!isWaOpen)} className="bg-[#eefcf2] hover:bg-[#e4f9e9] cursor-pointer px-6 py-3 flex items-center justify-between transition-colors rounded-b-[16px]">
              <svg className={`w-5 h-5 text-green-600 transition-transform duration-300 ${isWaOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              <span className="text-[12px] font-bold text-green-700">Kirim Laporan Via WhatsApp</span>
            </div>
            {isWaOpen && (
              <div className="bg-[#eefcf2] px-6 pb-5 pt-2 animate-in slide-in-from-top-2 duration-200 rounded-b-[16px]">
                <p className="text-[12px] font-bold text-green-800 mb-2">Fitur Kirim Laporan via WhatsApp akan segera aktif.</p>
                <input type="text" placeholder="No. Whatsapp (08xxxxxxxxx)" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} className="w-full max-w-sm border border-green-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-green-500 mb-3 block" />
                <button onClick={() => alert("Sabar bro, fitur WA-nya kita bangun nanti! 😂")} className="bg-[#5c9854] hover:bg-green-700 text-white px-8 py-2 rounded-[6px] text-[12px] font-bold transition-colors">
                  Kirim Pesan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* UI CONTROL BAR (Filter & Mode Switch) */}
      {/* ========================================= */}
      {!isLoading && services.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-[16px] p-4 sm:p-5 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* BAGIAN KIRI: Filter Tanggal (UI Box Terpisah Sesuai Gambar) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
             <span className="text-[12px] font-bold text-gray-700 whitespace-nowrap">Filter Tanggal:</span>
             <div className="flex items-center gap-2">
               <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="border border-gray-200 rounded-[8px] px-3 py-2 text-[12px] font-medium outline-none focus:border-black transition-colors bg-white w-full sm:w-[130px]" 
                  style={{ colorScheme: 'light' }}
               />
               <span className="text-gray-400 font-bold text-[12px] px-1">-</span>
               <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="border border-gray-200 rounded-[8px] px-3 py-2 text-[12px] font-medium outline-none focus:border-black transition-colors bg-white w-full sm:w-[130px]" 
                  style={{ colorScheme: 'light' }}
               />
               {(startDate || endDate) && (
                 <button onClick={() => {setStartDate(""); setEndDate("");}} className="ml-1 text-[12px] font-bold text-red-500 hover:text-red-700 transition-colors">
                   Reset
                 </button>
               )}
             </div>
          </div>

          {/* BAGIAN KANAN: Switch View & Export */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            
            {/* SWITCH TOGGLE (Timeline vs Tabel) */}
            <div className="relative bg-[#f1f5f9] border border-gray-200 p-1 rounded-[10px] flex items-center w-[180px] h-[36px] cursor-pointer shadow-inner">
              
              {/* Indikator Latar Belakang Putih */}
              <div 
                className="absolute top-1 bottom-1 w-[86px] bg-white rounded-[8px] shadow-sm transition-all duration-300 ease-in-out border border-gray-200"
                style={{ left: viewMode === "timeline" ? "4px" : "88px" }}
              />

              {/* Tombol Timeline */}
              <button 
                onClick={() => setViewMode("timeline")} 
                className={`relative z-10 w-1/2 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${viewMode === 'timeline' ? 'text-black' : 'text-gray-500'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                Timeline
              </button>

              {/* Tombol Tabel */}
              <button 
                onClick={() => setViewMode("table")} 
                className={`relative z-10 w-1/2 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${viewMode === 'table' ? 'text-black' : 'text-gray-500'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></rect>
                  <path d="M3 9h18M9 21V9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                Tabel
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
            
            {/* Tombol Export */}
            <button 
              onClick={handleExportExcel} 
              className="bg-[#10B981] text-white px-4 py-2 rounded-[8px] text-[12px] font-bold shadow-sm hover:bg-emerald-600 transition-colors flex items-center gap-1.5 h-[36px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* AREA RENDERER */}
      {/* ========================================= */}
      {!isLoading && filteredServices.length === 0 ? (
        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
           <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
           <p className="font-bold text-gray-500 text-[14px]">Tidak ada data riwayat servis.</p>
           {services.length > 0 && <p className="text-[12px] mt-1">Coba sesuaikan filter tanggal untuk melihat data lainnya.</p>}
        </div>
      ) : viewMode === "table" ? (
        /* MODE TABEL (Aksi pakai Ikon Titik 3) */
        <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-[12px] font-bold text-gray-700 w-36">Tanggal</th>
                  <th className="p-4 text-[12px] font-bold text-gray-700 w-48">Judul Pekerjaan</th>
                  <th className="p-4 text-[12px] font-bold text-gray-700 min-w-[200px]">Detail</th>
                  <th className="p-4 text-[12px] font-bold text-gray-700 w-32">PIC</th>
                  <th className="p-4 text-[12px] font-bold text-gray-700 w-24 text-center">Bukti</th>
                  <th className="p-4 text-[12px] font-bold text-gray-700 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredServices.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-[12px] font-medium text-gray-600">{formatDate(s.tanggal)}</td>
                    <td className="p-4 text-[13px] font-bold text-gray-900">{s.judul_service}</td>
                    <td className="p-4 text-[12px] text-gray-600 whitespace-pre-wrap">{s.detail_pekerjaan || "-"}</td>
                    <td className="p-4 text-[12px] font-bold text-gray-600">{s.pic}</td>
                    <td className="p-4 text-[12px] text-center">
                      {s.foto_dokumentasi ? (
                        <a href={s.foto_dokumentasi} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline font-bold">Lihat</a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[13px] flex items-center justify-center">
                      <button onClick={() => handleOpenEditModal(s)} className="p-1.5 text-gray-400 hover:text-black transition-colors" title="Opsi Servis">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE ZIGZAG TIMELINE */
        <div className="relative wrap overflow-hidden p-4 sm:p-10 h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="absolute border-opacity-20 border-gray-300 h-full border-l-2 left-1/2 -translate-x-1/2"></div>
          
          {filteredServices.map((service, index) => {
            const isEven = index % 2 === 0;

            return (
              <div key={service.id} className={`mb-10 flex justify-between items-center w-full ${isEven ? 'right-timeline' : 'flex-row-reverse left-timeline'} relative`}>
                <div className={`order-1 w-5/12 ${isEven ? 'text-right pr-4 sm:pr-8' : 'text-left pl-4 sm:pl-8'}`}>
                  <p className="text-[13px] font-bold text-gray-500">{formatDate(service.tanggal)}</p>
                </div>
                <div className="z-20 flex items-center justify-center order-1 bg-white border-4 border-gray-200 w-4 h-4 rounded-full"></div>
                <div className={`order-1 bg-white border border-gray-200 rounded-[12px] shadow-sm w-5/12 p-4 sm:p-5 hover:border-gray-300 transition-colors ${isEven ? 'text-left' : 'text-right'}`}>
                  
                  <h3 className="font-bold text-gray-800 text-[14px] leading-relaxed mb-1">{service.judul_service}</h3>
                  
                  {service.detail_pekerjaan && (
                    <p className={`text-[12px] text-gray-600 bg-gray-50 p-2.5 rounded-[8px] border border-gray-100 mb-3 whitespace-pre-wrap ${!isEven && 'text-left'}`}>
                      {service.detail_pekerjaan}
                    </p>
                  )}

                  {service.foto_dokumentasi && (
                    <a href={service.foto_dokumentasi} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-50 text-blue-600 rounded-[8px] text-[11px] font-bold hover:bg-blue-100 transition-colors border border-blue-100 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      Lihat Foto Bukti
                    </a>
                  )}

                  <div className={`flex items-center justify-between pt-3 mt-1 border-t border-gray-100 ${!isEven && 'flex-row-reverse'}`}>
                    <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      {service.pic}
                    </p>
                    
                    {/* Tombol Opsi / Edit di Timeline */}
                    <button onClick={() => handleOpenEditModal(service)} className="text-[11px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-100">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                      Opsi
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL FORM (UNTUK TAMBAH BARU & EDIT) */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[18px] font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
              {modalMode === "add" ? "Catat Servis Baru" : "Edit Catatan Servis"}
            </h2>
            
            <form onSubmit={handleSubmitClick} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Tanggal Servis</label>
                <input type="date" required value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Judul Pekerjaan</label>
                <input type="text" required placeholder="Misal: Ganti oli dan filter" value={formData.judul_service} onChange={(e) => setFormData({...formData, judul_service: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Detail Pekerjaan (Opsional)</label>
                <textarea rows={3} placeholder="Penjelasan detail perbaikan..." value={formData.detail_pekerjaan} onChange={(e) => setFormData({...formData, detail_pekerjaan: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black resize-none"></textarea>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-[11px] font-bold text-gray-700">Foto Bukti / Dokumentasi (Opsional)</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="w-16 h-16 rounded-[8px] bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                    {fotoFile ? (
                      <img src={URL.createObjectURL(fotoFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : modalMode === "edit" && selectedService?.foto_dokumentasi ? (
                      <img src={selectedService.foto_dokumentasi} alt="Existing" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-[8px] text-[12px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors w-full text-center">
                    {fotoFile || (modalMode === "edit" && selectedService?.foto_dokumentasi) ? "Ganti Foto" : "Pilih Foto"}
                    <input type="file" accept="image/*" onChange={(e) => e.target.files && setFotoFile(e.target.files[0])} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">PIC (Penanggung Jawab)</label>
                <input type="text" required placeholder="Nama teknisi / Sistem" value={formData.pic} onChange={(e) => setFormData({...formData, pic: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
              </div>

              <div className="flex justify-between items-center pt-6 mt-4 border-t border-gray-100">
                {modalMode === "edit" ? (
                  <button type="button" onClick={() => triggerDelete(selectedService.id, selectedService.judul_service)} className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-[8px] hover:bg-red-100 transition-colors">Hapus</button>
                ) : (
                  <div></div> 
                )}
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors">Batal</button>
                  <button type="submit" className="px-5 py-2.5 text-[12px] font-bold text-white bg-black rounded-[8px] hover:bg-gray-800 transition-colors">Simpan Catatan</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL CUSTOM SIMPAN (2-LANGKAH) */}
      {/* ========================================= */}
      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {submitModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-200"><svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Penyimpanan Gagal</h3>
                <p className="text-[13px] text-gray-500 mb-8">{submitModal.message}</p>
                <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="w-full px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors">Tutup & Perbaiki</button>
              </>
            ) : submitModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900">Catatan Tersimpan!</h3>
              </div>
            ) : submitModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Mengupload & Menyimpan...</h3>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100"><svg className="w-8 h-8 text-[#2D68FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Catatan Servis?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">Apakah Anda yakin detail pekerjaan dan foto bukti sudah benar?</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setSubmitModal({ isOpen: false, status: "confirm" })} className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full">Batal</button>
                  <button onClick={executeSubmit} className="px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] hover:bg-gray-800 transition-colors w-full">Ya, Simpan</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL CUSTOM HAPUS (2-LANGKAH) */}
      {/* ========================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {deleteModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil Dihapus!</h3>
              </div>
            ) : deleteModal.status === "deleting" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Menghapus Data...</h3>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Hapus Riwayat?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">Yakin ingin menghapus riwayat <strong>"{deleteModal.judul}"</strong>?</p>
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