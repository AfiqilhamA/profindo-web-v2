"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../utils/supabase"; 
import { countries } from "../../../../../utils/countries";

// FUNGSI SAKTI: BAKAR TIMESTAMP
const addTimestampToImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const now = new Date();
        const timestamp = now.toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        }) + " WIB";

        const fontSize = Math.max(16, img.width * 0.03); 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = "white"; 
        ctx.strokeStyle = "black"; 
        ctx.lineWidth = fontSize * 0.15;
        ctx.textBaseline = "bottom";
        ctx.textAlign = "right";

        const padding = fontSize;
        const x = canvas.width - padding;
        const y = canvas.height - padding;

        ctx.strokeText(timestamp, x, y);
        ctx.fillText(timestamp, x, y);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], `timestamped_${file.name}`, { type: file.type });
            resolve(newFile);
          } else {
            resolve(file); 
          }
        }, file.type, 0.9);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function AddMachinePage() {
  const router = useRouter();
  
  const [idPrefix, setIdPrefix] = useState("PFD");
  const [idNumber, setIdNumber] = useState("");

  const [formData, setFormData] = useState({
    serial_number: "",
    nama_mesin: "",
    nama_klien: "", 
    kategori: "",
    tahun_pembuatan: "",
    kondisi: "",
    tanggal_serah_terima: ""
  });

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const [manufacturerQuery, setManufacturerQuery] = useState("");
  const [isManufacturerOpen, setIsManufacturerOpen] = useState(false);

  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const [submitModal, setSubmitModal] = useState<{isOpen: boolean, status: "confirm" | "saving" | "success"}>({
    isOpen: false,
    status: "confirm"
  });

  const [formError, setFormError] = useState("");

  const filteredCountries = countries.filter(country => country.name.toLowerCase().includes(countryQuery.toLowerCase()));
  const selectedCountryData = countries.find(c => c.name === countryQuery);

  const filteredManufacturers = countries.filter(country => country.name.toLowerCase().includes(manufacturerQuery.toLowerCase()));
  const selectedManufacturerData = countries.find(c => c.name === manufacturerQuery);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(""); 
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      const stampedFile = await addTimestampToImage(originalFile);
      setFotoFile(stampedFile);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setManualFile(e.target.files[0]);
    }
  };

  // --- FUNGSI VALIDASI UPDATE (KLIEN SEKARANG WAJIB) ---
  const validateForm = () => {
    setFormError("");
    
    if (!idNumber.trim()) return "Angka Product ID wajib diisi.";
    if (!formData.serial_number.trim()) return "Serial Number wajib diisi.";
    if (!formData.nama_mesin.trim()) return "Nama Mesin wajib diisi.";
    
    // VALIDASI BARU: Klien Wajib Diisi
    if (!formData.nama_klien.trim()) return "Nama Klien / Perusahaan wajib diisi.";
    
    if (!formData.kategori.trim()) return "Kategori wajib diisi.";
    if (!manufacturerQuery.trim()) return "Pabrikan wajib dipilih/diisi.";
    if (!countryQuery.trim()) return "Negara Asal wajib dipilih/diisi.";
    if (!formData.tanggal_serah_terima) return "Tanggal Serah Terima wajib diisi.";

    const currentYear = new Date().getFullYear();
    const yearRegex = /^\d{4}$/; 
    
    if (!formData.tahun_pembuatan.trim()) {
      return "Tahun Pembuatan wajib diisi.";
    }
    if (!yearRegex.test(formData.tahun_pembuatan)) {
      return "Tahun Pembuatan harus berupa 4 digit angka (contoh: 2024).";
    }
    const yearInt = parseInt(formData.tahun_pembuatan);
    if (yearInt < 1900 || yearInt > currentYear + 1) {
      return `Tahun Pembuatan harus masuk akal (1900 - ${currentYear + 1}).`;
    }

    if (!formData.kondisi) return "Kondisi mesin wajib dipilih.";

    return null; 
  };

  const handleGenerateQR = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault(); 

    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      window.scrollTo({ top: 0, behavior: "smooth" }); 
      return;
    }

    const finalProductId = `${idPrefix}-${idNumber}`;
    const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(finalProductId)}`;
    setQrUrl(generatedQrUrl);
    setQrGenerated(true); 
  };

  const handleDownloadQR = async () => {
    if (!qrUrl) return;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `QR-${idPrefix}-${idNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Gagal download QR:", error);
      alert("Gagal mendownload QR Code.");
    }
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    
    const errorMsg = validateForm();
    if (errorMsg) {
      setFormError(errorMsg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    if (!qrGenerated) {
      handleGenerateQR(e);
      return;
    }

    setSubmitModal({ isOpen: true, status: "confirm" });
  };

  const executeSubmit = async () => {
    setSubmitModal({ isOpen: true, status: "saving" });

    let fotoUrl = null;
    let manualUrl = null;

    if (fotoFile) {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${Date.now()}-foto.${fileExt}`;
      const { data: fotoData, error: fotoError } = await supabase.storage.from('machine_files').upload(`foto/${fileName}`, fotoFile);
      
      if (fotoError) {
        alert("Gagal mengupload foto mesin: " + fotoError.message);
        setSubmitModal({ isOpen: false, status: "confirm" });
        return; 
      }
      if (fotoData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`foto/${fileName}`);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    if (manualFile) {
      const fileExt = manualFile.name.split('.').pop();
      const fileName = `${Date.now()}-manual.${fileExt}`;
      const { data: manualData, error: manualError } = await supabase.storage.from('machine_files').upload(`manual/${fileName}`, manualFile);
      
      if (manualError) {
        alert("Gagal mengupload buku manual: " + manualError.message);
        setSubmitModal({ isOpen: false, status: "confirm" });
        return; 
      }
      if (manualData) {
        const { data: publicUrlData } = supabase.storage.from('machine_files').getPublicUrl(`manual/${fileName}`);
        manualUrl = publicUrlData.publicUrl;
      }
    }

    const finalProductId = `${idPrefix}-${idNumber}`;

    const { error } = await supabase
      .from("machines")
      .insert([
        {
          product_id: finalProductId,
          serial_number: formData.serial_number,
          nama_mesin: formData.nama_mesin,
          nama_klien: formData.nama_klien,
          kategori: formData.kategori,
          pabrikan: manufacturerQuery,
          negara_asal: countryQuery, 
          tahun_pembuatan: formData.tahun_pembuatan,
          kondisi: formData.kondisi,
          tanggal_serah_terima: formData.tanggal_serah_terima,
          foto_mesin: fotoUrl,        
          buku_manual: manualUrl,     
          qr_code: qrUrl
        }
      ]);

    if (error) {
      alert("Gagal menyimpan data mesin: " + error.message);
      setSubmitModal({ isOpen: false, status: "confirm" }); 
    } else {
      setSubmitModal({ isOpen: true, status: "success" });
      setTimeout(() => {
        router.push("/dashboard/admin/inventory"); 
      }, 1500);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full relative"> 
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-[10px] hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Tambah Mesin Baru</h1>
      </div>

      <form onSubmit={handleSubmitClick} className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-6 sm:p-8">
        
        {formError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-3 animate-in fade-in zoom-in duration-300">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="text-[13px] font-bold text-red-700 leading-tight">{formError}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-3 mb-6">Deskripsi</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Product ID</label>
              <div className="flex gap-2">
                <div className="relative w-1/3">
                  <select 
                    value={idPrefix} 
                    onChange={(e) => { setIdPrefix(e.target.value); setFormError(""); }} 
                    className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] font-bold outline-none focus:border-black transition-colors appearance-none bg-gray-50 text-gray-800"
                  >
                    <option value="PFD">PFD</option>
                    <option value="YMS">YMS</option>
                    <option value="SPD">SPD</option>
                  </select>
                  <svg className="absolute right-3 top-[14px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Contoh: 12345" 
                  value={idNumber} 
                  onChange={(e) => { setIdNumber(e.target.value.replace(/[^0-9]/g, '')); setFormError(""); }}
                  className={`w-2/3 border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Product ID") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} 
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Serial Number</label>
              <input type="text" name="serial_number" value={formData.serial_number} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Serial Number") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Nama Mesin</label>
              <input type="text" name="nama_mesin" value={formData.nama_mesin} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Nama Mesin") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>

            {/* UPDATE: LABEL KLIEN SEKARANG WAJIB (HILANG TULISAN OPSIONAL) */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Nama Klien / Perusahaan</label>
              <input type="text" name="nama_klien" placeholder="Contoh: PT. Maju Jaya" value={formData.nama_klien} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Klien") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[12px] font-bold text-gray-700">Kategori</label>
              <input type="text" name="kategori" value={formData.kategori} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Kategori") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>
            
            <div className="space-y-1.5 relative z-20">
              <label className="text-[12px] font-bold text-gray-700">Pabrikan</label>
              <div className="relative flex items-center">
                {selectedManufacturerData && (
                  <img src={`https://flagcdn.com/w20/${selectedManufacturerData.code}.png`} alt="flag" className="absolute left-3 w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] pointer-events-none" />
                )}
                <input 
                  type="text" 
                  value={manufacturerQuery}
                  onChange={(e) => { setManufacturerQuery(e.target.value); setIsManufacturerOpen(true); setFormError(""); }}
                  onFocus={() => setIsManufacturerOpen(true)}
                  onBlur={() => setTimeout(() => setIsManufacturerOpen(false), 200)}
                  placeholder="Ketik nama pabrikan..."
                  className={`w-full border rounded-[8px] ${selectedManufacturerData ? 'pl-10' : 'pl-3'} pr-8 py-2.5 text-[13px] outline-none transition-colors bg-white ${formError.includes("Pabrikan") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`}
                />
                <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {isManufacturerOpen && (
                <div className="absolute top-[65px] left-0 w-full bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-[220px] overflow-y-auto z-50">
                  {filteredManufacturers.length > 0 ? (
                    filteredManufacturers.map((country, idx) => (
                      <div 
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); setManufacturerQuery(country.name); setIsManufacturerOpen(false); setFormError(""); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                      >
                        <img src={`https://flagcdn.com/w20/${country.code}.png`} alt={country.name} className="w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
                        {country.name}
                      </div>
                    ))
                  ) : ( <div className="px-4 py-3 text-[13px] text-gray-400 text-center">Negara tidak ditemukan</div> )}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5 relative z-10">
              <label className="text-[12px] font-bold text-gray-700">Negara Asal</label>
              <div className="relative flex items-center">
                {selectedCountryData && (
                  <img src={`https://flagcdn.com/w20/${selectedCountryData.code}.png`} alt="flag" className="absolute left-3 w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] pointer-events-none" />
                )}
                <input 
                  type="text" 
                  value={countryQuery}
                  onChange={(e) => { setCountryQuery(e.target.value); setIsCountryOpen(true); setFormError(""); }}
                  onFocus={() => setIsCountryOpen(true)}
                  onBlur={() => setTimeout(() => setIsCountryOpen(false), 200)}
                  placeholder="Ketik nama negara..."
                  className={`w-full border rounded-[8px] ${selectedCountryData ? 'pl-10' : 'pl-3'} pr-8 py-2.5 text-[13px] outline-none transition-colors bg-white ${formError.includes("Negara Asal") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`}
                />
                <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {isCountryOpen && (
                <div className="absolute top-[65px] left-0 w-full bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-[220px] overflow-y-auto z-50">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country, idx) => (
                      <div 
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); setCountryQuery(country.name); setIsCountryOpen(false); setFormError(""); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                      >
                        <img src={`https://flagcdn.com/w20/${country.code}.png`} alt={country.name} className="w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
                        {country.name}
                      </div>
                    ))
                  ) : ( <div className="px-4 py-3 text-[13px] text-gray-400 text-center">Negara tidak ditemukan</div> )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Tanggal Serah Terima</label>
              <input type="date" name="tanggal_serah_terima" value={formData.tanggal_serah_terima} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Tanggal") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-700">Tahun Pembuatan</label>
              <input type="text" name="tahun_pembuatan" value={formData.tahun_pembuatan} onChange={handleTextChange} placeholder="Contoh: 2024" className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors ${formError.includes("Tahun") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`} />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2 relative">
              <label className="text-[12px] font-bold text-gray-700">Kondisi</label>
              <select name="kondisi" value={formData.kondisi} onChange={handleTextChange} className={`w-full border rounded-[8px] px-3 py-2.5 text-[13px] outline-none transition-colors appearance-none bg-white ${formError.includes("Kondisi") ? 'border-red-500 bg-red-50/50' : 'border-gray-200 focus:border-black'}`}>
                <option value=""></option>
                <option value="Baru">Baru</option>
                <option value="Bekas">Bekas</option>
              </select>
              <svg className="absolute right-3 top-[34px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

          </div>
        </div>

        <div>
          <h2 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-3 mb-6">Media & Dokumen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <label className="bg-[#f8f9fb] border border-gray-200 rounded-[12px] h-[220px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group relative overflow-hidden">
              <input type="file" onChange={handleFotoChange} className="hidden" accept="image/png, image/jpeg" />
              {fotoFile ? (
                <img src={URL.createObjectURL(fotoFile)} alt="Preview Foto" className="w-full h-full object-cover absolute inset-0 z-10" />
              ) : (
                <>
                  <div className="w-14 h-14 bg-gray-400 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-500 transition-colors shadow-sm">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <p className="text-[13px] font-bold text-gray-700">Upload Foto Mesin</p>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">Otomatis Ditambah Watermark Waktu</p>
                </>
              )}
            </label>

            <label className="bg-[#f8f9fb] border border-gray-200 rounded-[12px] h-[220px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group">
              <input type="file" onChange={handleManualChange} className="hidden" accept=".pdf" />
              <div className="mb-4 text-gray-400 group-hover:text-gray-600 transition-colors">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <p className="text-[13px] font-bold text-gray-700">{manualFile ? manualFile.name : "Upload Buku Manual"}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Format PDF up to 5MB</p>
            </label>
          </div>
        </div>

        {qrGenerated && (
          <div className="mt-10 pt-8 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-[14px] font-bold text-gray-900 mb-6">QR Preview</h2>
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white border border-gray-200 rounded-[12px] shadow-sm mb-5">
                <img src={qrUrl} alt="QR Code Preview" className="w-[180px] h-[180px]" />
              </div>
              <button 
                type="button" 
                onClick={handleDownloadQR}
                className="bg-[#2D68FF] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[8px] text-[13px] font-bold transition-colors shadow-sm active:scale-95"
              >
                Click to Download
              </button>
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-end gap-4">
          {!qrGenerated ? (
            <button 
              type="button"
              onClick={(e) => handleGenerateQR(e)}
              className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-[10px] text-[13px] font-bold transition-all active:scale-95 shadow-md"
            >
              Generate QR
            </button>
          ) : (
            <button 
              type="submit" 
              className="bg-[#2D68FF] hover:bg-blue-700 text-white px-8 py-3 rounded-[10px] text-[13px] font-bold shadow-md transition-all active:scale-95"
            >
              Simpan & Tambah Mesin
            </button>
          )}
        </div>
        
      </form>

      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            
            {submitModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil Tersimpan!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Data mesin dan QR Code telah ditambahkan ke sistem.</p>
              </div>
            ) : submitModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6">
                <svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-[16px] font-bold text-gray-900">Mengupload & Menyimpan...</h3>
                <p className="text-[12px] text-gray-500 mt-1">Harap tunggu sebentar, file sedang diproses.</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100">
                  <svg className="w-8 h-8 text-[#2D68FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                </div>
                
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Data Mesin?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
                  Apakah Anda yakin semua data teks, Foto Mesin, dan Buku Manual sudah benar?
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