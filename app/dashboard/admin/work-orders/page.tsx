"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../utils/supabase";
import { generateUniqueWoNumber } from "../../../../utils/woNumber";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedWo, setSelectedWo] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    wo_number: "",
    nama_klien: "", 
    machine_id: "",
    technician_id: "",
    judul_pekerjaan: "",
    deskripsi: "",
    priority: "Medium",
    status: "Open", 
    jadwal_mulai: "",
    jadwal_selesai: "",
  });

  // State Modal dengan Error Handling
  const [submitModal, setSubmitModal] = useState({ isOpen: false, status: "confirm" as "confirm" | "saving" | "success" | "error", message: "" });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", judul: "", status: "idle" as "idle" | "deleting" | "success" | "error", message: "" });
  const [statusModal, setStatusModal] = useState({ isOpen: false, id: "", wo_number: "", newStatus: "", status: "confirm" as "confirm" | "saving" | "success" | "error", message: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [woRes, machineRes, techRes] = await Promise.all([
      supabase
        .from("work_orders")
        .select(`*, machines(nama_klien, nama_mesin), technicians(nama_lengkap)`)
        .order("created_at", { ascending: false }),
      supabase.from("machines").select("id, nama_mesin, nama_klien"),
      supabase.from("technicians").select("*")
    ]);

    setWorkOrders(woRes.data || []);
    setMachines(machineRes.data || []);
    
    // FILTER SUPER KETAT: SINGKIRKAN ADMIN DARI DAFTAR TEKNISI!
    if (techRes.data) {
      const fieldTechnicians = techRes.data.filter((tech: any) => {
        const role = (tech.role || tech.jabatan || tech.posisi || "").toLowerCase();
        return !role.includes("admin");
      });
      setTechnicians(fieldTechnicians);
    } else {
      setTechnicians([]);
    }

    setIsLoading(false);
  };

  const handleOpenAdd = async () => {
    setModalMode("add");
    setSelectedWo(null);
    const woNumber = await generateUniqueWoNumber();
    setFormData({
      wo_number: woNumber, 
      nama_klien: "",
      machine_id: "", technician_id: "", judul_pekerjaan: "", deskripsi: "",
      priority: "Medium", status: "Open", jadwal_mulai: "", jadwal_selesai: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wo: any) => {
    setModalMode("edit");
    setSelectedWo(wo);
    setFormData({
      wo_number: wo.wo_number, 
      nama_klien: wo.nama_klien || "",
      machine_id: wo.machine_id || "", 
      technician_id: wo.technician_id || "",
      judul_pekerjaan: wo.judul_pekerjaan || "", 
      deskripsi: wo.deskripsi || "",
      priority: wo.priority || "Medium", 
      status: wo.status || "Open", 
      jadwal_mulai: wo.jadwal_mulai || "", 
      jadwal_selesai: wo.jadwal_selesai || ""
    });
    setIsModalOpen(true);
  };

  const executeSubmit = async () => {
    setSubmitModal({ ...submitModal, isOpen: true, status: "saving" });

    const payload = {
      wo_number: formData.wo_number,
      nama_klien: formData.nama_klien, 
      judul_pekerjaan: formData.judul_pekerjaan,
      deskripsi: formData.deskripsi,
      priority: formData.priority,
      status: formData.status,
      jadwal_mulai: formData.jadwal_mulai || null,
      jadwal_selesai: formData.jadwal_selesai || null,
      machine_id: formData.machine_id ? formData.machine_id : null,
      technician_id: formData.technician_id ? formData.technician_id : null,
    };

    let error;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: actor } = user ? await supabase.from("technicians").select("nama_lengkap").eq("email", user.email ?? "").maybeSingle() : { data: null };
    const actorName = actor?.nama_lengkap || "Admin";

    if (modalMode === "add") {
      const { error: insErr } = await supabase.from("work_orders").insert([payload]);
      error = insErr;
      if (!error) {
        await supabase.from("activity_logs").insert([{
          actor_name: actorName,
          action_text: `membuat Work Order baru (${payload.wo_number})`,
          tipe_aktivitas: "Work Order"
        }]);
      }
    } else {
      const { error: updErr } = await supabase.from("work_orders").update(payload).eq("id", selectedWo.id);
      error = updErr;
      if (!error) {
        await supabase.from("activity_logs").insert([{
          actor_name: actorName,
          action_text: `memperbarui data Work Order (${payload.wo_number})`,
          tipe_aktivitas: "Work Order"
        }]);
      }
    }

    if (error) {
      console.error("Work order mutation failed", error);
      setSubmitModal({ isOpen: true, status: "error", message: "Work order gagal disimpan. Periksa data lalu coba lagi." });
    } else {
      setSubmitModal({ isOpen: true, status: "success", message: "" });
      setTimeout(() => {
        setSubmitModal({ isOpen: false, status: "confirm", message: "" });
        setIsModalOpen(false);
        fetchData();
      }, 1500);
    }
  };

  const triggerStatusUpdate = (id: string, wo_number: string, newStatus: string) => {
    setStatusModal({ isOpen: true, id, wo_number, newStatus, status: "confirm", message: "" });
  };

  const executeStatusUpdate = async () => {
    setStatusModal({ ...statusModal, status: "saving", message: "" });
    const { error } = await supabase.from("work_orders").update({ status: statusModal.newStatus }).eq("id", statusModal.id);
    
    if (!error) {
       const { data: { user } } = await supabase.auth.getUser();
       const { data: actor } = user ? await supabase.from("technicians").select("nama_lengkap").eq("email", user.email ?? "").maybeSingle() : { data: null };
       const actorName = actor?.nama_lengkap || "Admin";
       await supabase.from("activity_logs").insert([{
         actor_name: actorName, 
         action_text: `mengubah status ${statusModal.wo_number} menjadi ${statusModal.newStatus}`,
         tipe_aktivitas: "Work Order"
       }]);

       setStatusModal({ ...statusModal, status: "success" });
       setTimeout(() => {
         setStatusModal({ isOpen: false, id: "", wo_number: "", newStatus: "", status: "confirm", message: "" });
         fetchData();
       }, 1500);
    } else {
       // KALO GAGAL, KASIH TAU ERRORNYA
       console.error("Work order status update failed", error);
       setStatusModal({ ...statusModal, status: "error", message: "Status work order gagal diperbarui. Coba lagi." });
    }
  };

  const triggerDelete = (id: string, judul: string) => {
    setDeleteModal({ isOpen: true, id, judul, status: "idle", message: "" });
  };

  const executeDelete = async () => {
    setDeleteModal({ ...deleteModal, status: "deleting", message: "" });
    const { error } = await supabase.from("work_orders").delete().eq("id", deleteModal.id);
    
    if (!error) {
      setDeleteModal({ ...deleteModal, status: "success" });
      setTimeout(() => {
        setDeleteModal({ isOpen: false, id: "", judul: "", status: "idle", message: "" });
        fetchData();
      }, 1500);
    } else {
      // KALO GAGAL, KASIH TAU ERRORNYA
      console.error("Work order delete failed", error);
      setDeleteModal({ ...deleteModal, status: "error", message: "Work order gagal dihapus. Coba lagi." });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Completed") return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-bold">Completed</span>;
    if (status === "In Progress") return <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-md text-[11px] font-bold">In Progress</span>;
    return <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-md text-[11px] font-bold">Open</span>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "High") return <span className="text-red-600 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> High</span>;
    if (priority === "Medium") return <span className="text-orange-500 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Medium</span>;
    return <span className="text-gray-500 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Low</span>;
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 w-full max-w-6xl mx-auto relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Work Orders</h1>
          <p className="text-[13px] text-gray-500 font-medium mt-1">Kelola log pekerjaan dan status servis mesin.</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          Buat Work Order
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20">
            <svg className="animate-spin h-8 w-8 text-[#10B981] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-gray-500 text-[13px] font-bold">Memuat data...</p>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <p className="font-bold text-gray-500 text-[14px]">Belum ada Work Order.</p>
            <p className="text-[12px] text-gray-400 mt-1">Klik tombol di kanan atas untuk membuat tugas baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-[12px] font-bold text-gray-600 w-[140px]">WO Number</th>
                  <th className="p-4 text-[12px] font-bold text-gray-600 min-w-[200px]">Klien & Mesin</th>
                  <th className="p-4 text-[12px] font-bold text-gray-600 w-[160px]">Teknisi</th>
                  <th className="p-4 text-[12px] font-bold text-gray-600 w-[120px]">Prioritas</th>
                  <th className="p-4 text-[12px] font-bold text-gray-600 w-[120px]">Status</th>
                  <th className="p-4 text-[12px] font-bold text-gray-600 w-[180px] text-center">Aksi (Ubah Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-[13px] font-extrabold text-gray-900">{wo.wo_number}</td>
                    <td className="p-4">
                      <p className="text-[13px] font-bold text-gray-800">{wo.nama_klien || wo.machines?.nama_klien || "Umum / Internal"}</p>
                      <p className="text-[12px] text-gray-500 font-medium mt-0.5">{wo.machines?.nama_mesin || "Mesin tidak diketahui / Servis Umum"}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{wo.judul_pekerjaan}</p>
                    </td>
                    <td className="p-4 text-[12px] font-bold text-gray-700">{wo.technicians?.nama_lengkap || "Belum ditugaskan"}</td>
                    <td className="p-4 text-[12px]">{getPriorityBadge(wo.priority)}</td>
                    <td className="p-4">{getStatusBadge(wo.status)}</td>
                    
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {wo.status === "Open" && (
                          <button onClick={() => triggerStatusUpdate(wo.id, wo.wo_number, "In Progress")} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-[11px] font-bold hover:bg-orange-200 transition-colors">Proses</button>
                        )}
                        {wo.status === "In Progress" && (
                          <button onClick={() => triggerStatusUpdate(wo.id, wo.wo_number, "Completed")} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md text-[11px] font-bold hover:bg-emerald-200 transition-colors">Selesai</button>
                        )}
                        
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        
                        <button onClick={() => handleOpenEdit(wo)} className="p-1.5 text-gray-400 hover:text-black transition-colors" title="Edit WO">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onClick={() => triggerDelete(wo.id, wo.wo_number)} className="p-1.5 text-red-300 hover:text-red-600 transition-colors" title="Hapus WO">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL FORM ADD / EDIT */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[600px] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[18px] font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
              {modalMode === "add" ? "Buat Work Order Baru" : "Edit Work Order"}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); setSubmitModal({ isOpen: true, status: "confirm", message: "" }); }} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">WO Number</label>
                <input type="text" required value={formData.wo_number} onChange={(e) => setFormData({...formData, wo_number: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-[8px] px-3 py-2.5 text-[13px] outline-none font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black bg-white appearance-none">
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Prioritas</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black bg-white appearance-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Nama Klien / Perusahaan</label>
                <input type="text" placeholder="Masukkan nama klien (Opsional)" value={formData.nama_klien} onChange={(e) => setFormData({...formData, nama_klien: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Target Mesin (Opsional)</label>
                <select value={formData.machine_id} onChange={(e) => setFormData({...formData, machine_id: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black bg-white">
                  <option value="">-- Servis Umum / Tanpa Mesin --</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.nama_klien ? `${m.nama_klien} - ` : ''}{m.nama_mesin}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Teknisi Ditugaskan</label>
                <select value={formData.technician_id} onChange={(e) => setFormData({...formData, technician_id: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black bg-white">
                  <option value="">-- Pilih Teknisi --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.nama_lengkap}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Judul Pekerjaan</label>
                <input type="text" required placeholder="Misal: Inspeksi Rutin Bulanan" value={formData.judul_pekerjaan} onChange={(e) => setFormData({...formData, judul_pekerjaan: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Jadwal Mulai</label>
                  <input type="date" value={formData.jadwal_mulai} onChange={(e) => setFormData({...formData, jadwal_mulai: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Tenggat Waktu</label>
                  <input type="date" value={formData.jadwal_selesai} onChange={(e) => setFormData({...formData, jadwal_selesai: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Instruksi / Deskripsi Detail</label>
                <textarea rows={3} placeholder="Tuliskan detail pekerjaan..." value={formData.deskripsi} onChange={(e) => setFormData({...formData, deskripsi: e.target.value})} className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13px] outline-none focus:border-black resize-none"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-[8px] hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 text-[12px] font-bold text-white bg-black rounded-[8px] hover:bg-gray-800 transition-colors">Simpan Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODALS KONFIRMASI DENGAN ERROR HANDLING */}
      {/* ========================================= */}
      
      {/* 1. MODAL SUBMIT FORM */}
      {submitModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {submitModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-red-600 mb-2">Simpan Gagal!</h3>
                <p className="text-[13px] text-gray-500 mb-6">{submitModal.message}</p>
                <button onClick={() => setSubmitModal({ ...submitModal, status: "confirm", message: "" })} className="w-full bg-black text-white py-2.5 rounded-[10px] text-[13px] font-bold">Tutup & Perbaiki</button>
              </>
            ) : submitModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div><h3 className="text-[18px] font-bold text-gray-900">Work Order Tersimpan!</h3></div>
            ) : submitModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6"><svg className="animate-spin h-10 w-10 text-[#2D68FF] mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><h3 className="text-[16px] font-bold text-gray-900">Menyimpan Data...</h3></div>
            ) : (
              <><h3 className="text-[18px] font-bold text-gray-900 mb-2">Simpan Work Order?</h3><p className="text-[13px] text-gray-500 mb-8">Data akan ditambahkan ke log operasional.</p><div className="flex justify-center gap-3"><button onClick={() => setSubmitModal({ ...submitModal, isOpen: false })} className="px-6 py-2.5 text-[13px] font-bold bg-gray-100 rounded-[10px] w-full">Batal</button><button onClick={executeSubmit} className="px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] w-full">Simpan</button></div></>
            )}
          </div>
        </div>
      )}

      {/* 2. MODAL UPDATE STATUS */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {statusModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-red-600 mb-2">Update Gagal!</h3>
                <p className="text-[13px] text-gray-500 mb-6">{statusModal.message}</p>
                <button onClick={() => setStatusModal({ ...statusModal, status: "confirm", message: "" })} className="w-full bg-black text-white py-2.5 rounded-[10px] text-[13px] font-bold">Tutup & Coba Lagi</button>
              </>
            ) : statusModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div><h3 className="text-[18px] font-bold text-gray-900">Status Berhasil Diubah!</h3></div>
            ) : statusModal.status === "saving" ? (
              <div className="flex flex-col items-center justify-center py-6"><svg className="animate-spin h-10 w-10 text-orange-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><h3 className="text-[16px] font-bold text-gray-900">Memperbarui Status...</h3></div>
            ) : (
              <><div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5"><svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div><h3 className="text-[18px] font-bold text-gray-900 mb-2">Update Status WO?</h3><p className="text-[13px] text-gray-500 mb-8">Ubah status <strong>{statusModal.wo_number}</strong> menjadi <span className="font-bold text-black">{statusModal.newStatus}</span>?</p><div className="flex justify-center gap-3"><button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className="px-6 py-2.5 text-[13px] font-bold bg-gray-100 rounded-[10px] w-full">Batal</button><button onClick={executeStatusUpdate} className="px-6 py-2.5 text-[13px] font-bold text-white bg-black rounded-[10px] w-full">Ya, Update</button></div></>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL HAPUS WO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[400px] p-8 text-center animate-in zoom-in-95 duration-200">
            {deleteModal.status === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h3 className="text-[18px] font-bold text-red-600 mb-2">Hapus Gagal!</h3>
                <p className="text-[13px] text-gray-500 mb-6">{deleteModal.message}</p>
                <button onClick={() => setDeleteModal({ ...deleteModal, status: "idle", message: "" })} className="w-full bg-black text-white py-2.5 rounded-[10px] text-[13px] font-bold">Tutup & Coba Lagi</button>
              </>
            ) : deleteModal.status === "success" ? (
              <div className="flex flex-col items-center justify-center py-4"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div><h3 className="text-[18px] font-bold text-gray-900">Berhasil Dihapus!</h3></div>
            ) : deleteModal.status === "deleting" ? (
              <div className="flex flex-col items-center justify-center py-6"><svg className="animate-spin h-10 w-10 text-red-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><h3 className="text-[16px] font-bold text-gray-900">Menghapus...</h3></div>
            ) : (
              <><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div><h3 className="text-[18px] font-bold text-gray-900 mb-2">Hapus Work Order?</h3><p className="text-[13px] text-gray-500 mb-8">Yakin ingin menghapus <strong>{deleteModal.judul}</strong>? Aksi ini tidak dapat dibatalkan.</p><div className="flex justify-center gap-3"><button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="px-6 py-2.5 text-[13px] font-bold bg-gray-100 rounded-[10px] w-full">Batal</button><button onClick={executeDelete} className="px-6 py-2.5 text-[13px] font-bold text-white bg-red-600 rounded-[10px] w-full">Ya, Hapus</button></div></>
            )}
          </div>
        </div>
      )}

    </div>
  );
}