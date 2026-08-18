import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, nama_lengkap, role, no_whatsapp, username, fotoUrl } = body;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, 
    });

    if (authError) throw authError;

    const { error: dbError } = await supabaseAdmin.from('technicians').insert([{
      nama_lengkap, email, username, no_whatsapp, role, foto_profil: fotoUrl,
    }]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Teknisi berhasil didaftarkan!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}