"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabase";

// --- DATA NEGARA (FULL TANPA DIPOTONG) ---
const countries = [
  { name: "Afganistan", code: "af" }, { name: "Afrika Selatan", code: "za" }, { name: "Albania", code: "al" }, { name: "Aljazair", code: "dz" }, { name: "Amerika Serikat (AS)", code: "us" }, { name: "Andorra", code: "ad" }, { name: "Angola", code: "ao" }, { name: "Antigua dan Barbuda", code: "ag" }, { name: "Arab Saudi", code: "sa" }, { name: "Argentina", code: "ar" }, { name: "Australia", code: "au" }, { name: "Austria", code: "at" },
  { name: "Bahama", code: "bs" }, { name: "Bahrain", code: "bh" }, { name: "Bangladesh", code: "bd" }, { name: "Barbados", code: "bb" }, { name: "Belarus", code: "by" }, { name: "Belgia", code: "be" }, { name: "Belize", code: "bz" }, { name: "Benin", code: "bj" }, { name: "Bhutan", code: "bt" }, { name: "Bolivia", code: "bo" }, { name: "Bosnia dan Herzegovina", code: "ba" }, { name: "Botswana", code: "bw" }, { name: "Brasil", code: "br" }, { name: "Brunei Darussalam", code: "bn" }, { name: "Bulgaria", code: "bg" }, { name: "Burkina Faso", code: "bf" }, { name: "Burundi", code: "bi" },
  { name: "Ceko", code: "cz" }, { name: "Chad", code: "td" }, { name: "Chili", code: "cl" }, { name: "China", code: "cn" },
  { name: "Denmark", code: "dk" }, { name: "Djibouti", code: "dj" }, { name: "Dominika", code: "dm" },
  { name: "Ekuador", code: "ec" }, { name: "El Salvador", code: "sv" }, { name: "Eritrea", code: "er" }, { name: "Estonia", code: "ee" }, { name: "Eswatini", code: "sz" }, { name: "Ethiopia", code: "et" },
  { name: "Fiji", code: "fj" }, { name: "Filipina", code: "ph" }, { name: "Finlandia", code: "fi" },
  { name: "Gabon", code: "ga" }, { name: "Gambia", code: "gm" }, { name: "Ghana", code: "gh" }, { name: "Grenada", code: "gd" }, { name: "Guatemala", code: "gt" }, { name: "Guinea", code: "gn" }, { name: "Guinea Khatulistiwa", code: "gq" }, { name: "Guinea-Bissau", code: "gw" }, { name: "Guyana", code: "gy" },
  { name: "Haiti", code: "ht" }, { name: "Honduras", code: "hn" }, { name: "Hungaria", code: "hu" },
  { name: "India", code: "in" }, { name: "Indonesia", code: "id" }, { name: "Inggris Raya", code: "gb" }, { name: "Irak", code: "iq" }, { name: "Iran", code: "ir" }, { name: "Irlandia", code: "ie" }, { name: "Islandia", code: "is" }, { name: "Israel", code: "il" }, { name: "Italia", code: "it" },
  { name: "Jamaika", code: "jm" }, { name: "Jepang", code: "jp" }, { name: "Jerman", code: "de" },
  { name: "Kamboja", code: "kh" }, { name: "Kamerun", code: "cm" }, { name: "Kanada", code: "ca" }, { name: "Kazakhstan", code: "kz" }, { name: "Kenya", code: "ke" }, { name: "Kepulauan Marshall", code: "mh" }, { name: "Kepulauan Solomon", code: "sb" }, { name: "Kirgistan", code: "kg" }, { name: "Kiribati", code: "ki" }, { name: "Kolombia", code: "co" }, { name: "Komoro", code: "km" }, { name: "Kongo", code: "cg" }, { name: "Korea Selatan", code: "kr" }, { name: "Korea Utara", code: "kp" }, { name: "Kosta Rika", code: "cr" }, { name: "Kroasia", code: "hr" }, { name: "Kuba", code: "cu" }, { name: "Kuwait", code: "kw" },
  { name: "Laos", code: "la" }, { name: "Latvia", code: "lv" }, { name: "Lebanon", code: "lb" }, { name: "Lesotho", code: "ls" }, { name: "Liberia", code: "lr" }, { name: "Libya", code: "ly" }, { name: "Lithuania", code: "lt" }, { name: "Luksemburg", code: "lu" },
  { name: "Madagaskar", code: "mg" }, { name: "Makedonia Utara", code: "mk" }, { name: "Malawi", code: "mw" }, { name: "Malaysia", code: "my" }, { name: "Maladewa", code: "mv" }, { name: "Mali", code: "ml" }, { name: "Malta", code: "mt" }, { name: "Maroko", code: "ma" }, { name: "Mauritania", code: "mr" }, { name: "Mauritius", code: "mu" }, { name: "Meksiko", code: "mx" }, { name: "Mesir", code: "eg" }, { name: "Mikronesia", code: "fm" }, { name: "Moldova", code: "md" }, { name: "Monako", code: "mc" }, { name: "Mongolia", code: "mn" }, { name: "Montenegro", code: "me" }, { name: "Mozambik", code: "mz" }, { name: "Myanmar", code: "mm" },
  { name: "Namibia", code: "na" }, { name: "Nauru", code: "nr" }, { name: "Nepal", code: "np" }, { name: "Niger", code: "ne" }, { name: "Nigeria", code: "ng" }, { name: "Nikaragua", code: "ni" }, { name: "Norwegia", code: "no" },
  { name: "Oman", code: "om" },
  { name: "Pakistan", code: "pk" }, { name: "Palau", code: "pw" }, { name: "Palestina", code: "ps" }, { name: "Panama", code: "pa" }, { name: "Pantai Gading", code: "ci" }, { name: "Papua Nugini", code: "pg" }, { name: "Paraguay", code: "py" }, { name: "Peru", code: "pe" }, { name: "Polandia", code: "pl" }, { name: "Portugal", code: "pt" }, { name: "Prancis", code: "fr" },
  { name: "Qatar", code: "qa" },
  { name: "Republik Afrika Tengah", code: "cf" }, { name: "Republik Demokratik Kongo", code: "cd" }, { name: "Republik Dominika", code: "do" }, { name: "Rumania", code: "ro" }, { name: "Rusia", code: "ru" }, { name: "Rwanda", code: "rw" },
  { name: "Saint Kitts dan Nevis", code: "kn" }, { name: "Saint Lucia", code: "lc" }, { name: "Saint Vincent dan Grenadines", code: "vc" }, { name: "Samoa", code: "ws" }, { name: "San Marino", code: "sm" }, { name: "Sao Tome dan Principe", code: "st" }, { name: "Selandia Baru", code: "nz" }, { name: "Senegal", code: "sn" }, { name: "Serbia", code: "rs" }, { name: "Seychelles", code: "sc" }, { name: "Sierra Leone", code: "sl" }, { name: "Singapura", code: "sg" }, { name: "Siprus", code: "cy" }, { name: "Slowakia", code: "sk" }, { name: "Slovenia", code: "si" }, { name: "Somalia", code: "so" }, { name: "Spanyol", code: "es" }, { name: "Sri Lanka", code: "lk" }, { name: "Sudan", code: "sd" }, { name: "Sudan Selatan", code: "ss" }, { name: "Suriah", code: "sy" }, { name: "Suriname", code: "sr" }, { name: "Swedia", code: "se" }, { name: "Swiss", code: "ch" },
  { name: "Taiwan", code: "tw" }, { name: "Tajikistan", code: "tj" }, { name: "Tanjung Verde", code: "cv" }, { name: "Tanzania", code: "tz" }, { name: "Thailand", code: "th" }, { name: "Timor Leste", code: "tl" }, { name: "Tiongkok (China)", code: "cn" }, { name: "Togo", code: "tg" }, { name: "Tonga", code: "to" }, { name: "Trinidad dan Tobago", code: "tt" }, { name: "Tunisia", code: "tn" }, { name: "Turki", code: "tr" }, { name: "Turkmenistan", code: "tm" }, { name: "Tuvalu", code: "tv" },
  { name: "Uganda", code: "ug" }, { name: "Ukraina", code: "ua" }, { name: "Uni Emirat Arab (UEA)", code: "ae" }, { name: "Uruguay", code: "uy" }, { name: "Uzbekistan", code: "uz" },
  { name: "Vanuatu", code: "vu" }, { name: "Vatikan", code: "va" }, { name: "Venezuela", code: "ve" }, { name: "Vietnam", code: "vn" },
  { name: "Yaman", code: "ye" }, { name: "Yordania", code: "jo" }, { name: "Yunani", code: "gr" },
  { name: "Zambia", code: "zm" }, { name: "Zimbabwe", code: "zw" }
];

const getCountryFlagCode = (countryName: string) => {
  if (!countryName) return null;
  const found = countries.find(c => c.name.toLowerCase() === countryName.trim().toLowerCase());
  return found ? found.code : null;
};

export default function InventoryPage() {
  const router = useRouter();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    "Nama Mesin": "", "Kategori": "", "Pabrikan": "", "Asal": "", "Tahun": "", "Kondisi": "",
  });

  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [machines, setMachines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  
  // --- FITUR BARU: STATE UNTUK ANIMASI SUCCESS ---
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", nama: "" });
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "success">("idle");

  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [editManualFile, setEditManualFile] = useState<File | null>(null);

  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isManufacturerOpen, setIsManufacturerOpen] = useState(false);

  // --- DITAMBAH nama_klien ---
  const [editFormData, setEditFormData] = useState({
    product_id: "", serial_number: "", nama_mesin: "", nama_klien: "", kategori: "",
    pabrikan: "", negara_asal: "", tahun_pembuatan: "", kondisi: "",
    tanggal_serah_terima: "", next_service: "",
  });

  const filterColumns = ["Nama Mesin", "Kategori", "Pabrikan", "Asal", "Tahun", "Kondisi"];
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCountries = countries.filter(country => country.name.toLowerCase().includes(editFormData.negara_asal.toLowerCase()));
  const selectedCountryData = countries.find(c => c.name === editFormData.negara_asal);

  const filteredManufacturers = countries.filter(country => country.name.toLowerCase().includes(editFormData.pabrikan.toLowerCase()));
  const selectedManufacturerData = countries.find(c => c.name === editFormData.pabrikan);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .eq("is_deleted", false) 
      .order("created_at", { ascending: false });
      
    if (!error) setMachines(data || []);
    setIsLoading(false);
  };

  const handleOpenOptions = (machine: any) => {
    setSelectedMachine(machine);
    setEditFotoFile(null); 
    setEditManualFile(null);
    setIsSuccess(false); // Reset status sukses setiap buka modal baru
    setEditFormData({
      product_id: machine.product_id || "", 
      serial_number: machine.serial_number || "",
      nama_mesin: machine.nama_mesin || "", 
      nama_klien: machine.nama_klien || "",
      kategori: machine.kategori || "",
      pabrikan: machine.pabrikan || "", 
      negara_asal: machine.negara_asal || "",
      tahun_pembuatan: machine.tahun_pembuatan || "", 
      kondisi: machine.kondisi || "",
      tanggal_serah_terima: machine.tanggal_serah_terima || "", 
      next_service: "", 
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setIsSaving(true);

    let fotoUrl = selectedMachine.foto_mesin;
    let manualUrl = selectedMachine.buku_manual;

    // Upload Foto Baru (jika ada)
    if (editFotoFile) {
      const fileExt = editFotoFile.name.split('.').pop();
      const fileName = `${Date.now()}-foto.${fileExt}`;
      const { data, error: fotoError } = await supabase.storage.from('machine_files').upload(`foto/${fileName}`, editFotoFile);
      
      if (fotoError) {
        alert("Gagal mengupload foto baru: " + fotoError.message);
        setIsSaving(false);
        return; 
      }
      if (data) {
        const { data: pubUrl } = supabase.storage.from('machine_files').getPublicUrl(`foto/${fileName}`);
        fotoUrl = pubUrl.publicUrl;
      }
    }

    // Upload Manual Baru (jika ada)
    if (editManualFile) {
      const fileExt = editManualFile.name.split('.').pop();
      const fileName = `${Date.now()}-manual.${fileExt}`;
      const { data, error: manualError } = await supabase.storage.from('machine_files').upload(`manual/${fileName}`, editManualFile);
      
      if (manualError) {
        alert("Gagal mengupload buku manual baru: " + manualError.message);
        setIsSaving(false);
        return; 
      }
      if (data) {
        const { data: pubUrl } = supabase.storage.from('machine_files').getPublicUrl(`manual/${fileName}`);
        manualUrl = pubUrl.publicUrl;
      }
    }

    // Update data mesin utama
    const { error: updateError } = await supabase.from("machines").update({
      product_id: editFormData.product_id, 
      serial_number: editFormData.serial_number,
      nama_mesin: editFormData.nama_mesin, 
      nama_klien: editFormData.nama_klien, 
      kategori: editFormData.kategori,
      pabrikan: editFormData.pabrikan, 
      negara_asal: editFormData.negara_asal,
      tahun_pembuatan: editFormData.tahun_pembuatan, 
      kondisi: editFormData.kondisi,
      tanggal_serah_terima: editFormData.tanggal_serah_terima,
      foto_mesin: fotoUrl, 
      buku_manual: manualUrl
    }).eq("id", selectedMachine.id);

    if (updateError) {
      alert("Gagal memperbarui data mesin: " + updateError.message);
      setIsSaving(false);
      return;
    }

    // --- LOGIKA BARU: AUTO-CREATE WORK ORDER ---
    if (editFormData.next_service && !updateError) {
      const woNumber = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { error: workOrderError } = await supabase
        .from("work_orders")
        .insert([
          {
            wo_number: woNumber,
            machine_id: selectedMachine.id,             // Menggunakan ID mesin yang sedang di-edit
            jadwal_mulai: editFormData.next_service,    // Tanggal dari input Next Service
            status: "Open",
            judul_pekerjaan: "Servis Berkala Otomatis",
            deskripsi: "Jadwal servis otomatis dari form edit inventory."
          }
        ]);

      if (workOrderError) {
        alert("Data mesin tersimpan, tetapi gagal membuat work order: " + workOrderError.message);
        await fetchMachines();
        setEditFotoFile(null);
        setEditManualFile(null);
        setIsSuccess(false);
        setIsSaving(false);
        setIsEditModalOpen(false);
        return;
      }
    }

    // Jika semua berhasil, tampilkan animasi sukses tanpa alert()
    setIsSaving(false);
    setIsSuccess(true); 
    fetchMachines(); 

    // Tutup otomatis setelah 1.5 detik
    setTimeout(() => {
      setIsSuccess(false);
      setIsEditModalOpen(false);
    }, 1500);
  };

  const triggerDelete = () => {
    if (!selectedMachine) return;
    setDeleteModal({ isOpen: true, id: selectedMachine.id, nama: selectedMachine.nama_mesin });
    setDeleteStatus("idle");
  };

  const executeDelete = async () => {
    setDeleteStatus("deleting");
    const { error } = await supabase
      .from("machines")
      .update({ is_deleted: true }) 
      .eq("id", deleteModal.id);
    
    if (error) {
      alert("Gagal menghapus data: " + error.message);
      setDeleteStatus("idle");
    } else {
      setDeleteStatus("success");
      await supabase.from("activity_logs").insert([{
        actor_name: "Admin",
        action_text: `menghapus mesin ${deleteModal.nama} ke tempat sampah`,
        tipe_aktivitas: "Inventory"
      }]);

      setTimeout(() => {
        setDeleteModal({ isOpen: false, id: "", nama: "" });
        setIsEditModalOpen(false); 
        fetchMachines();
      }, 1500);
    }
  };

  const handleDownloadPhoto = async (url: string, filename: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Gagal download foto:", error);
      alert("Gagal mendownload foto mesin.");
    }
  };

  let processedMachines = [...machines];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedMachines = processedMachines.filter(m => 
      m.nama_mesin?.toLowerCase().includes(q) || m.product_id?.toLowerCase().includes(q) ||
      m.kategori?.toLowerCase().includes(q) || m.pabrikan?.toLowerCase().includes(q) ||
      m.serial_number?.toLowerCase().includes(q) || m.nama_klien?.toLowerCase().includes(q)
    );
  }

  if (filterValues["Nama Mesin"]) processedMachines = processedMachines.filter(m => m.nama_mesin?.toLowerCase().includes(filterValues["Nama Mesin"].toLowerCase()));
  if (filterValues["Kategori"]) processedMachines = processedMachines.filter(m => m.kategori?.toLowerCase().includes(filterValues["Kategori"].toLowerCase()));
  if (filterValues["Pabrikan"]) processedMachines = processedMachines.filter(m => m.pabrikan?.toLowerCase().includes(filterValues["Pabrikan"].toLowerCase()));
  if (filterValues["Asal"]) processedMachines = processedMachines.filter(m => m.negara_asal?.toLowerCase().includes(filterValues["Asal"].toLowerCase()));
  if (filterValues["Tahun"]) processedMachines = processedMachines.filter(m => m.tahun_pembuatan?.toLowerCase().includes(filterValues["Tahun"].toLowerCase()));
  if (filterValues["Kondisi"]) processedMachines = processedMachines.filter(m => m.kondisi?.toLowerCase().includes(filterValues["Kondisi"].toLowerCase()));

  if (sortColumn) {
    processedMachines.sort((a, b) => {
      const dbColMap: any = { "Nama Mesin": "nama_mesin", "Kategori": "kategori", "Pabrikan": "pabrikan", "Asal": "negara_asal", "Tahun": "tahun_pembuatan", "Kondisi": "kondisi" };
      const colName = dbColMap[sortColumn];
      const valA = (a[colName] || "").toString().toLowerCase();
      const valB = (b[colName] || "").toString().toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  const clearFilters = () => setFilterValues({ "Nama Mesin": "", "Kategori": "", "Pabrikan": "", "Asal": "", "Tahun": "", "Kondisi": "" });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 relative">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Daftar Alat Berat</h1>
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

          <div className="flex items-center gap-3 border-l border-gray-200 pl-4" ref={dropdownRef}>
            <div className="relative">
              <button 
                onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
                className={`flex items-center gap-2 border rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors ${isFilterOpen || Object.values(filterValues).some(v => v !== "") ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter {Object.values(filterValues).some(v => v !== "") && " (Aktif)"}
              </button>

              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-[480px] bg-white border border-gray-200 rounded-[12px] shadow-2xl p-5 z-50">
                  <div className="space-y-3">
                    {filterColumns.map((col) => (
                      <div key={col} className="flex gap-3">
                        <div className="relative w-[40%]">
                          <select disabled className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] font-medium text-gray-600 bg-gray-50 outline-none appearance-none cursor-not-allowed">
                            <option value={col}>{col}</option>
                          </select>
                        </div>
                        <input 
                          type="text" placeholder={`Search ${col}...`} value={filterValues[col]} onChange={(e) => setFilterValues({...filterValues, [col]: e.target.value})}
                          className="w-[60%] border border-gray-200 rounded-[8px] px-4 py-2.5 text-[13px] outline-none focus:border-black transition-colors" 
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-center gap-3">
                    <button onClick={clearFilters} className="px-6 py-2 border border-red-200 text-red-600 rounded-[8px] text-[13px] font-bold hover:bg-red-50 transition-colors shadow-sm">Reset</button>
                    <button onClick={() => setIsFilterOpen(false)} className="px-8 py-2 bg-black text-white rounded-[8px] text-[13px] font-bold hover:bg-gray-800 transition-colors shadow-sm">Tutup</button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
                className={`flex items-center gap-2 border rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors ${isSortOpen || sortColumn !== "" ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                Sort
              </button>

              {isSortOpen && (
                <div className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-gray-200 rounded-[12px] shadow-2xl p-5 z-50">
                  <div className="space-y-3">
                    {filterColumns.map((col) => (
                      <label key={col} className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" name="sortColumn" checked={sortColumn === col} onChange={() => setSortColumn(col)} className="w-4 h-4 accent-black bg-gray-100 border-gray-300 cursor-pointer" />
                        <span className="text-[13px] font-bold text-gray-700 group-hover:text-black">{col}</span>
                      </label>
                    ))}
                  </div>
                  <div className="h-px bg-gray-100 my-4"></div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="sortOrder" checked={sortOrder === "asc"} onChange={() => setSortOrder("asc")} className="w-4 h-4 accent-black cursor-pointer hidden" />
                      <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-black' : 'text-gray-400'} group-hover:text-black`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                      <span className={`text-[13px] font-bold ${sortOrder === 'asc' ? 'text-black' : 'text-gray-500'} group-hover:text-black`}>Ascending</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="sortOrder" checked={sortOrder === "desc"} onChange={() => setSortOrder("desc")} className="w-4 h-4 accent-black cursor-pointer hidden" />
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'text-black' : 'text-gray-400'} group-hover:text-black`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                      <span className={`text-[13px] font-bold ${sortOrder === 'desc' ? 'text-black' : 'text-gray-500'} group-hover:text-black`}>Descending</span>
                    </label>
                  </div>
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={() => setSortColumn("")} className="w-full py-2 border border-red-200 text-red-600 rounded-[8px] text-[12px] font-bold hover:bg-red-50 transition-colors shadow-sm">Reset</button>
                    <button onClick={() => setIsSortOpen(false)} className="w-full py-2 bg-black text-white rounded-[8px] text-[12px] font-bold hover:bg-gray-800 transition-colors shadow-sm">Terapkan</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
        <button 
          onClick={() => router.push("/dashboard/admin/inventory/add")}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all active:scale-95 flex items-center gap-2 shrink-0 shadow-md z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Tambah Mesin Baru
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden z-0 relative">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-32">Product id</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-44">Serial Number</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-48">Nama Mesin</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-36">Klien</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-32">Kategori</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-36">Pabrikan</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-36">Asal</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-36">Tgl Serah Terima</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-24">Tahun</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 w-28">Kondisi</th>
                <th className="p-4 text-[13px] font-bold text-gray-900 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span className="text-[13px] text-gray-500">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : processedMachines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-sm font-bold text-gray-500">Data tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedMachines.map((machine) => {
                  const pabrikanFlag = getCountryFlagCode(machine.pabrikan);
                  const asalFlag = getCountryFlagCode(machine.negara_asal);

                  return (
                    <tr key={machine.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[13px] font-medium text-gray-700">{machine.product_id || "-"}</td>
                      <td className="p-4 text-[13px] text-gray-600">{machine.serial_number || "-"}</td>
                      <td className="p-4 text-[13px] font-bold text-gray-900">{machine.nama_mesin || "-"}</td>
                      {/* NAMPILIN NAMA KLIEN DI TABEL */}
                      <td className="p-4 text-[13px] font-medium text-gray-800">{machine.nama_klien || "-"}</td>
                      <td className="p-4 text-[13px] text-gray-700">{machine.kategori || "-"}</td>
                      
                      <td className="p-4 text-[13px] text-gray-700">
                        <div className="flex items-center gap-2">
                          {pabrikanFlag && (
                            <img src={`https://flagcdn.com/w20/${pabrikanFlag}.png`} alt="flag" className="w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] shrink-0" />
                          )}
                          <span className="truncate">{machine.pabrikan || "-"}</span>
                        </div>
                      </td>

                      <td className="p-4 text-[13px] text-gray-700">
                        <div className="flex items-center gap-2">
                          {asalFlag && (
                            <img src={`https://flagcdn.com/w20/${asalFlag}.png`} alt="flag" className="w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] shrink-0" />
                          )}
                          <span className="truncate">{machine.negara_asal || "-"}</span>
                        </div>
                      </td>

                      <td className="p-4 text-[13px] text-gray-700">{machine.tanggal_serah_terima || "-"}</td>
                      <td className="p-4 text-[13px] text-gray-700">{machine.tahun_pembuatan || "-"}</td>
                      <td className="p-4 text-[13px]">
                        {machine.kondisi ? (
                          <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold tracking-wide 
                            ${machine.kondisi.toLowerCase() === 'baru' || machine.kondisi.toLowerCase() === 'baik' ? 'bg-green-100 text-green-700' : 
                              machine.kondisi.toLowerCase() === 'rusak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                          >
                            {machine.kondisi}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-4 text-[13px] flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenOptions(machine)} className="p-1.5 text-gray-400 hover:text-black transition-colors" title="Opsi Mesin">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL POP-UP EDIT / DETAIL MESIN */}
      {/* ========================================= */}
      {isEditModalOpen && selectedMachine && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
            
            {/* --- KONDISI: JIKA SUKSES MENYIMPAN --- */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Berhasil Diperbarui!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Data mesin dan jadwal service telah disimpan.</p>
              </div>
            ) : (
              /* --- KONDISI: FORM EDIT --- */
              <>
                <div className="sticky top-0 bg-white z-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-[18px] font-bold text-gray-900">Detail & Edit Mesin</h2>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="p-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Product ID</label>
                          <input type="text" name="product_id" value={editFormData.product_id} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Serial Number</label>
                          <input type="text" name="serial_number" value={editFormData.serial_number} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Nama Mesin</label>
                          <input type="text" name="nama_mesin" value={editFormData.nama_mesin} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>
                        {/* INPUT NAMA KLIEN BARU DI SINI */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Nama Klien / Perusahaan</label>
                          <input type="text" name="nama_klien" placeholder="Contoh: PT. Maju Jaya" value={editFormData.nama_klien} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[11px] font-bold text-gray-700">Kategori</label>
                          <input type="text" name="kategori" value={editFormData.kategori} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>

                        <div className="space-y-1.5 relative z-40">
                          <label className="text-[11px] font-bold text-gray-700">Pabrikan</label>
                          <div className="relative flex items-center">
                            {selectedManufacturerData && (
                              <img src={`https://flagcdn.com/w20/${selectedManufacturerData.code}.png`} alt="flag" className="absolute left-3 w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] pointer-events-none" />
                            )}
                            <input 
                              type="text" 
                              value={editFormData.pabrikan}
                              onChange={(e) => { setEditFormData({ ...editFormData, pabrikan: e.target.value }); setIsManufacturerOpen(true); }}
                              onFocus={() => setIsManufacturerOpen(true)}
                              onBlur={() => setTimeout(() => setIsManufacturerOpen(false), 200)}
                              className={`w-full border border-gray-200 rounded-[8px] ${selectedManufacturerData ? 'pl-10' : 'pl-3'} pr-8 py-2 text-[13px] outline-none focus:border-black transition-colors bg-white`}
                            />
                            <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                          {isManufacturerOpen && (
                            <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-[160px] overflow-y-auto z-[60]">
                              {filteredManufacturers.length > 0 ? (
                                filteredManufacturers.map((country, idx) => (
                                  <div 
                                    key={idx}
                                    onMouseDown={(e) => { e.preventDefault(); setEditFormData({ ...editFormData, pabrikan: country.name }); setIsManufacturerOpen(false); }}
                                    className="flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <img src={`https://flagcdn.com/w20/${country.code}.png`} alt={country.name} className="w-4 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
                                    {country.name}
                                  </div>
                                ))
                              ) : ( <div className="px-3 py-2 text-[12px] text-gray-400 text-center">Tidak ditemukan</div> )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 relative z-30">
                          <label className="text-[11px] font-bold text-gray-700">Negara Asal</label>
                          <div className="relative flex items-center">
                            {selectedCountryData && (
                              <img src={`https://flagcdn.com/w20/${selectedCountryData.code}.png`} alt="flag" className="absolute left-3 w-5 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] pointer-events-none" />
                            )}
                            <input 
                              type="text" 
                              value={editFormData.negara_asal}
                              onChange={(e) => { setEditFormData({ ...editFormData, negara_asal: e.target.value }); setIsCountryOpen(true); }}
                              onFocus={() => setIsCountryOpen(true)}
                              onBlur={() => setTimeout(() => setIsCountryOpen(false), 200)}
                              className={`w-full border border-gray-200 rounded-[8px] ${selectedCountryData ? 'pl-10' : 'pl-3'} pr-8 py-2 text-[13px] outline-none focus:border-black transition-colors bg-white`}
                            />
                            <svg className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                          {isCountryOpen && (
                            <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-[160px] overflow-y-auto z-[60]">
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country, idx) => (
                                  <div 
                                    key={idx}
                                    onMouseDown={(e) => { e.preventDefault(); setEditFormData({ ...editFormData, negara_asal: country.name }); setIsCountryOpen(false); }}
                                    className="flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <img src={`https://flagcdn.com/w20/${country.code}.png`} alt={country.name} className="w-4 h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
                                    {country.name}
                                  </div>
                                ))
                              ) : ( <div className="px-3 py-2 text-[12px] text-gray-400 text-center">Tidak ditemukan</div> )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Tgl Serah Terima</label>
                          <input type="date" name="tanggal_serah_terima" value={editFormData.tanggal_serah_terima} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700">Tahun Pembuatan</label>
                          <input type="text" name="tahun_pembuatan" value={editFormData.tahun_pembuatan} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[11px] font-bold text-gray-700">Kondisi</label>
                          <select name="kondisi" value={editFormData.kondisi} onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-black bg-white">
                            <option value="Baru">Baru</option>
                            <option value="Bekas">Bekas</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Rusak">Rusak</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-2 pt-2 mt-2 border-t border-gray-100">
                          <label className="text-[12px] font-bold text-[#10B981] flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Atur Jadwal Next Service (Otomatis masuk ke Work Order)
                          </label>
                          <input 
                            type="date" name="next_service" 
                            value={editFormData.next_service} 
                            onChange={(e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value })} 
                            className="w-full border border-green-200 bg-green-50 rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-green-600 transition-colors" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* === KOLOM KANAN: Media & QR === */}
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 pl-0 md:pl-8 space-y-6">
                      
                      <div className="w-full relative group">
                        <h3 className="text-[12px] font-bold text-gray-700 mb-2">Foto Mesin</h3>
                        <div className="w-full aspect-[4/3] bg-gray-50 border border-gray-200 rounded-[12px] overflow-hidden flex items-center justify-center relative group">
                          {editFotoFile ? (
                            <img src={URL.createObjectURL(editFotoFile)} alt="Preview Baru" className="w-full h-full object-cover" />
                          ) : selectedMachine.foto_mesin ? (
                            <>
                              <img src={selectedMachine.foto_mesin} alt="Foto Mesin" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-2">
                                <button type="button" onClick={() => handleDownloadPhoto(selectedMachine.foto_mesin, selectedMachine.product_id || "foto_mesin")} className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-md text-white transition-colors" title="Download Foto">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                </button>
                                <button type="button" onClick={() => setPreviewImage(selectedMachine.foto_mesin)} className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-md text-white transition-colors" title="Lihat Penuh">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">Belum ada foto</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <label className="cursor-pointer flex items-center justify-center w-full py-1.5 border border-gray-200 text-[11px] font-bold text-gray-600 rounded-[6px] hover:bg-gray-50 transition-colors">
                            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => e.target.files && setEditFotoFile(e.target.files[0])} />
                            Ubah Foto Mesin
                          </label>
                        </div>
                      </div>

                      <div className="w-full">
                        <h3 className="text-[12px] font-bold text-gray-700 mb-2">Buku Manual</h3>
                        {selectedMachine.buku_manual ? (
                          <a href={selectedMachine.buku_manual} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-[#eff4ff] text-[#2D68FF] border border-[#d6e4ff] rounded-[8px] flex items-center justify-center gap-2 text-[12px] font-bold hover:bg-blue-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Buka Dokumen PDF
                          </a>
                        ) : (
                          <div className="w-full py-2.5 bg-gray-50 border border-gray-200 rounded-[8px] flex items-center justify-center text-[11px] text-gray-400 mb-2">
                            Belum ada dokumen
                          </div>
                        )}
                        <div className="mt-2">
                          <label className="cursor-pointer flex items-center justify-center w-full py-1.5 border border-gray-200 text-[11px] font-bold text-gray-600 rounded-[6px] hover:bg-gray-50 transition-colors">
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files && setEditManualFile(e.target.files[0])} />
                            {editManualFile ? "PDF Baru Terpilih ✔️" : "Ubah Dokumen Manual"}
                          </label>
                        </div>
                      </div>

                      <div className="w-full pt-4 border-t border-gray-100 flex flex-col items-center">
                        <h3 className="text-[12px] font-bold text-gray-700 mb-3 w-full text-left">QR Code Mesin</h3>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-[12px] mb-2">
                          {selectedMachine.qr_code ? (
                            <img src={selectedMachine.qr_code} alt="QR Mesin" className="w-[110px] h-[110px] object-cover mix-blend-multiply" />
                          ) : (
                            <div className="w-[110px] h-[110px] flex items-center justify-center text-gray-400 text-[11px] text-center p-2">Belum ada QR</div>
                          )}
                        </div>
                        {selectedMachine.qr_code && (
                          <a href={selectedMachine.qr_code} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                            Download QR
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        type="button" 
                        onClick={() => router.push(`/dashboard/admin/inventory/service/${selectedMachine.id}`)}
                        className="text-[12px] font-bold text-[#2D68FF] bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-[8px] hover:bg-blue-100 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Riwayat Service
                      </button>
                      <button 
                        type="button" 
                        onClick={triggerDelete} 
                        className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-[8px] hover:bg-red-100 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Hapus
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors">
                        Batal
                      </button>
                      <button type="submit" disabled={isSaving} className={`px-5 py-2.5 text-[12px] font-bold text-white bg-black rounded-[8px] hover:bg-gray-800 transition-colors flex items-center gap-2 ${isSaving ? 'opacity-70' : ''}`}>
                        {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL FULL SCREEN PREVIEW FOTO */}
      {/* ========================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <button onClick={() => handleDownloadPhoto(previewImage, selectedMachine?.product_id || "foto_mesin")} className="absolute top-6 right-20 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-[13px] font-bold transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Download
          </button>
          <img src={previewImage} alt="Full Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-[8px] shadow-2xl animate-in zoom-in-95 duration-300" />
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL POP-UP KONFIRMASI HAPUS & SUKSES */}
      {/* ========================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            
            {deleteStatus === "success" ? (
              <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Masuk Tempat Sampah!</h3>
                <p className="text-[13px] text-gray-500 mt-2">Data mesin telah dipindahkan ke Tempat Sampah.</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Hapus Mesin?</h3>
                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
                  Apakah Anda yakin ingin memindahkan mesin <strong>"{deleteModal.nama}"</strong> ke tempat sampah? 
                </p>
                
                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setDeleteModal({ isOpen: false, id: "", nama: "" })} 
                    disabled={deleteStatus === "deleting"} 
                    className="px-6 py-2.5 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-[10px] hover:bg-gray-200 transition-colors w-full"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeDelete} 
                    disabled={deleteStatus === "deleting"} 
                    className={`px-6 py-2.5 text-[13px] font-bold text-white bg-red-600 rounded-[10px] hover:bg-red-700 transition-colors w-full flex items-center justify-center gap-2 ${deleteStatus === "deleting" ? 'opacity-70' : ''}`}
                  >
                    {deleteStatus === "deleting" ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Memproses...
                      </>
                    ) : "Ya, Hapus"}
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