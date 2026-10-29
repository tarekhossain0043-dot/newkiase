import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const next = request.nextUrl.searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  if (!url || !key) return NextResponse.redirect(new URL("/account?error=configuration", request.url));
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({name,value,options})=>cookieStore.set(name,value,options)) } });
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  return NextResponse.redirect(new URL("/account?error=oauth", request.url));
}