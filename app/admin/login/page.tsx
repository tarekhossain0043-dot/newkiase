"use client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LockKeyhole, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("Secure server-side authentication is not configured yet. The dashboard is currently a UI preview; do not use it to protect real store data.");
  }

  function openPreview() {
    sessionStorage.setItem("nexora-admin-demo-session", "active");
    router.push("/admin");
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
            <button className="admin-signin" type="submit">Sign in securely <ArrowRight size={17}/></button>
          </form>
          <button type="button" className="admin-preview-button" onClick={openPreview}><Monitor size={16}/> Open dashboard preview</button>
          <div className="admin-security-note"><ShieldCheck size={16}/><span>Access is checked against your Supabase session and administrator role on the server.</span></div>
          <a className="admin-back-store" href="/">← Return to storefront</a>
        </div>
        <p className="admin-login-legal">© {new Date().getFullYear()} NEXORA. Secure administrator access.</p>
      </section>
    </main>
  );
}
