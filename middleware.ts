import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = [
  "/dashboard",
  "/crm",
  "/inventory",
  "/patients",
  "/tray",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 먼저 세션 동기화
  const response = await updateSession(request);

  // 유저 확인
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // 여기서는 직접 세팅 안 함
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 루트 접속 처리
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/crm" : "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 페이지는 로그인된 사용자가 오면 CRM으로 보냄
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/crm";
    return NextResponse.redirect(url);
  }

  // 보호 라우트인데 로그인 안 된 경우
  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    const nextPath =
      pathname + (request.nextUrl.search ? request.nextUrl.search : "");

    url.searchParams.set("next", nextPath);

    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/crm/:path*",
    "/inventory/:path*",
    "/patients/:path*",
    "/tray/:path*",
  ],
};