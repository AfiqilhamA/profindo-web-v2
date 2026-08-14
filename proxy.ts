import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isTechnician = path.startsWith("/technician");

  if (isDashboard || isTechnician) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { data: profile } = await supabase
      .from("technicians")
      .select("role, is_deleted")
      .eq("email", user.email ?? "")
      .maybeSingle();

    if (!profile || profile.is_deleted) {
      const signOutResponse = NextResponse.redirect(new URL("/login", request.url));
      request.cookies.getAll().forEach(({ name }) => signOutResponse.cookies.set(name, "", { maxAge: 0, path: "/" }));
      return signOutResponse;
    }

    const role = profile.role?.toLowerCase() ?? "";
    if ((isDashboard && !role.includes("admin")) || (isTechnician && role.includes("admin"))) {
      return NextResponse.redirect(new URL(role.includes("admin") ? "/dashboard/admin" : "/technician", request.url));
    }
  }

  if (path === "/login" && user) {
    const { data: profile } = await supabase.from("technicians").select("role, is_deleted").eq("email", user.email ?? "").maybeSingle();
    if (!profile || profile.is_deleted) {
      const signOutResponse = NextResponse.redirect(new URL("/login", request.url));
      request.cookies.getAll().forEach(({ name }) => signOutResponse.cookies.set(name, "", { maxAge: 0, path: "/" }));
      return signOutResponse;
    }
    return NextResponse.redirect(new URL(profile.role?.toLowerCase().includes("admin") ? "/dashboard/admin" : "/technician", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
