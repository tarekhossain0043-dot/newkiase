import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectToLogin(request: NextRequest, params?: Record<string, string>) {
  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  for (const [key, value] of Object.entries(params ?? {})) {
    login.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/admin/login" || pathname === "/admin/login/";
  const isAdminRoute = pathname.startsWith("/admin/") || pathname === "/admin";

  // Fail closed when Supabase is not configured: never expose the dashboard.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (isAdminRoute && !isLogin) {
      return redirectToLogin(request, { setup: "supabase" });
    }
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (isAdminRoute && !isLogin) {
    if (authError || !user) {
      return redirectToLogin(request, { next: pathname });
    }

    // The profile role is the sole authorization source; missing profiles and
    // database errors are denied, never treated as administrator access.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return redirectToLogin(request, { error: "not-admin" });
    }
  }

  // A signed-in customer may visit the login page, but only an admin can be
  // redirected into the private dashboard after authentication.
  if (isLogin && user && !authError) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profile?.role === "admin") {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname = "/admin";
      dashboard.search = "";
      const redirect = NextResponse.redirect(dashboard);
      redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
