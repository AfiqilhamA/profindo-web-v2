export interface Machine {
  id: string;
  nama_mesin: string;
  no_produk?: string;
  no_seri: string;
  tipe_mesin?: string;
  negara_pembuat?: string;
  tahun_pembuatan?: string | number;
  perusahaan_pembuat?: string;
  status: "Normal" | "Rusak" | "Perawatan" | "Bongkar" | string;
  lokasi_mesin?: string;
  nama_klien?: string;
  alamat_klien?: string;
  penanggung_jawab?: string;
  kontak_pj?: string;
  foto_mesin?: string;
  buku_manual?: string;
  deskripsi?: string;
  next_service?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  machine_id?: string;
  technician_id?: string;
  nama_klien?: string;
  judul_pekerjaan: string;
  deskripsi?: string;
  priority: "High" | "Medium" | "Low" | string;
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | string;
  jadwal_mulai?: string;
  jadwal_selesai?: string;
  created_at?: string;
  machines?: Partial<Machine>;
  profiles?: Partial<UserProfile>;
}

export interface UserProfile {
  id: string;
  email?: string;
  nama_lengkap: string;
  role: string;
  me_role?: string;
  jabatan?: string;
  posisi?: string;
  no_hp?: string;
  foto_profil?: string;
  is_deleted?: boolean;
  created_at?: string;
}

export interface ActivityLog {
  id?: number;
  actor_name: string;
  action_text: string;
  tipe_aktivitas: string;
  created_at?: string;
}

export interface ServiceRecord {
  id: number;
  machine_id: number;
  tanggal: string;
  judul_service: string;
  detail_pekerjaan?: string | null;
  pic: string;
  foto_dokumentasi?: string | null;
  created_at?: string;
}
