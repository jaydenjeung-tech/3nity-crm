import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = [
  "/dashboard",
  "/crm",
  "/inventory",
  "/crm/leads",
  "/patients",
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

  // 보호 라우트 아니면 그대로 통과
  if (!isProtectedPath(pathname)) {
    return response;
  }

  // 로그인 체크
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // middleware 여기서는 직접 세팅 안 함
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    "/dashboard/:path*",
    "/crm/:path*",
    "/inventory/:path*",
    "/crm/leads/:path*",
    "/patients/:path*",
  ],
};