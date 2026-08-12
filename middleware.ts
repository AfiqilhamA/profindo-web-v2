import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fungsi utama middleware yang jalan sebelum halaman di-render
export function middleware(request: NextRequest) {
  // Ambil data cookie yang kita set pas login tadi
  const userRoleCookie = request.cookies.get('user_role');
  const role = userRoleCookie?.value;

  const { pathname } = request.nextUrl;

  // 1. CEK HALAMAN ADMIN: Hanya boleh masuk kalau rolenya "Admin"
  if (pathname.startsWith('/dashboard/admin')) {
    if (role !== 'Admin') {
      // Tendang ke halaman login kalau bukan Admin
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. CEK HALAMAN TECHNICIAN: Hanya boleh masuk kalau rolenya "Technician"
  if (pathname.startsWith('/technician')) {
    if (role !== 'Technician') {
       // Tendang ke halaman login kalau bukan Teknisi
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. CEK HALAMAN GUEST: Hanya boleh masuk kalau rolenya "Guest"
  if (pathname.startsWith('/guest')) {
    if (role !== 'Guest') {
       // Tendang ke halaman login kalau bukan Guest
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Kalau semua aman, biarkan user masuk ke halamannya
  return NextResponse.next();
}

// Konfigurasi ini nentuin di rute (URL) mana aja middleware ini aktif bekerja
export const config = {
  matcher: [
    '/dashboard/admin/:path*',
    '/technician/:path*',
    '/guest/:path*',
  ],
};