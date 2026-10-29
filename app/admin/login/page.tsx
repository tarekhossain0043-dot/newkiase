"use client";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LockKeyhole, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) {
        await supabase.auth.signOut();
        setError("This account is not authorised as a NEXORA administrator.");
        return;
      }
      router.replace(searchParams.get("next") || "/admin");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("not configured") ? "Supabase setup is incomplete. Configure the project URL and publishable/anon key first." : "Sign-in failed. Check your email and password, then try again.");
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-art">
        <div className="admin-brand">NEXORA<span>ADMIN</span></div>
        <div className="admin-art-copy">
          <span className="admin-eyebrow">CONTROL CENTRE</span>
          <h1>Every detail.<br/><em>Under control.</em></h1>
          <p>Manage products, orders, inventory, customers and store performance from one workspace.</p>
          <div className="admin-art-stats">
            <div><b>01</b><span>Commerce</span></div>
            <div><b>02</b><span>Operations</span></div>
            <div><b>03</b><span>Insights</span></div>
          </div>
        </div>
        <div className="admin-art-foot">NEXORA COMMERCE SUITE · PRIVATE ACCESS</div>
      </div>
      <section className="admin-login-panel">
        <div className="admin-login-mobile-brand">NEXORA <span>ADMIN</span></div>
        <div className="admin-login-card">
          <div className="admin-lock"><LockKeyhole size={23}/></div>
          <span className="admin-eyebrow">ADMINISTRATOR ACCESS</span>
          <h2>Welcome back</h2>
          <p>Sign in with your authorised administrator account.</p>
          <form onSubmit={submit}>
            <label>Admin email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@yourstore.com"/></label>
            <label>Password<div className="admin-password"><input type={show?"text":"password"} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
            {error&&<p className="admin-login-error" role="alert">{error}</p>}
            {searchParams.get("setup")==="supabase"&&<p className="admin-login-error" role="alert">Supabase project credentials are not configured yet. Follow SUPABASE_SETUP.md.</p>}
            {searchParams.get("error")==="not-admin"&&<p className="admin-login-error" role="alert">This account does not have the administrator role.</p>}
            <button className="admin-signin" type="submit">Sign in securely <ArrowRight size={17}/></button>
          </form>
          <div className="admin-security-note"><ShieldCheck size={16}/><span>Access is checked against your Supabase session and administrator role on the server.</span></div>
          <a className="admin-back-store" href="/">← Return to storefront</a>
        </div>
        <p className="admin-login-legal">© {new Date().getFullYear()} NEXORA. Secure administrator access.</p>
      </section>
    </main>
  );
}


export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login-page"><section className="admin-login-panel"><p>Loading secure sign-in…</p></section></main>}>
      <AdminLoginForm />
    </Suspense>
  );
}
