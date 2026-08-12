import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

type LoginBody = { email?: unknown; password?: unknown };

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Input login tidak valid." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !email.includes("@") || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const headersToSet: Record<string, string> = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (newCookies, headers) => {
          cookiesToSet.push(...newCookies);
          Object.assign(headersToSet, headers);
        },
      },
    },
  );

  let { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  // Legacy migration: an old technicians row is converted to Supabase Auth on
  // first login. This path requires the service key on the server only.
  if (error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: legacy, error: legacyError } = await admin
      .from("technicians")
      .select("id, email, nama_lengkap, role, foto_profil, is_deleted")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    if (!legacyError && legacy && !legacy.is_deleted) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { technician_id: legacy.id, role: legacy.role },
      });

      if (!created.error || created.error.message.toLowerCase().includes("already registered")) {
        ({ data: authData, error } = await supabase.auth.signInWithPassword({ email, password }));
      }
    }
  }

  if (error || !authData.user) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
  const { data: profile } = admin
    ? await admin.from("technicians").select("role, nama_lengkap, foto_profil, is_deleted").eq("email", email).maybeSingle()
    : await supabase.from("technicians").select("role, nama_lengkap, foto_profil, is_deleted").eq("email", email).maybeSingle();

  if (!profile || profile.is_deleted) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Akun tidak aktif." }, { status: 403 });
  }

  const response = NextResponse.json({
    ok: true,
    role: profile.role,
    name: profile.nama_lengkap,
    avatar: profile.foto_profil ?? null,
  });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(headersToSet).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
