import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, email, password, nama_lengkap, username, no_whatsapp, role, fotoUrl } = body;

    // 1. Update data biasa di tabel 'technicians'
    const { error: dbError } = await supabaseAdmin.from('technicians').update({
      nama_lengkap, email, username, no_whatsapp, role, foto_profil: fotoUrl
    }).eq('id', id);

    if (dbError) throw dbError;

    // 2. CEK PASSWORD: Kalau Admin ngisi kotak password, kita ganti paksa di Supabase Auth!
    if (password && password.trim() !== "") {
      // Cari data otentikasi user ini berdasarkan email-nya
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) throw usersError;

      const authUser = usersData.users.find((u) => u.email === email);
      
      if (authUser) {
        // Eksekusi ganti password paksa (Reset Password)
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          { password: password }
        );
        if (authError) throw authError;
      }
    }

    return NextResponse.json({ success: true, message: "Data berhasil diupdate!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}