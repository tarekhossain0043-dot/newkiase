import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Local UI preview can still build before credentials exist, but admin APIs fail closed.
  // Once configured, every /admin route requires a valid Supabase session and admin role.
  if (!url || !key) {
    if (request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login") {
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.searchParams.set("setup", "supabase");
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") && !isLogin;

  if (isAdminRoute) {
    if (!user) {
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.searchParams.set("error", "not-admin");
      return NextResponse.redirect(login);
    }
  }

  if (isLogin && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname = "/admin";
      dashboard.search = "";
      return NextResponse.redirect(dashboard);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
