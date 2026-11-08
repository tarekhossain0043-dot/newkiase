"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "react-toastify";
export default function CustomerAccountPage() {
  const router = useRouter();
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [phone,setPhone] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("The authentication request is taking too long. Please check your internet connection and Supabase Auth settings, then try again.")), 15000);
    });
    try {
      const supabase=createSupabaseBrowserClient();
      if(mode==="signup") {
        const result = await Promise.race([
          supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim(),phone:phone.trim()},emailRedirectTo:location.origin+"/auth/callback"}}),
          timeout
        ]);
        if(result.error) throw result.error;
        if(result.data.session) {
          await fetch("/api/customer/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name.trim(),phone:phone.trim()})});
          router.replace("/account?welcome=1");
          router.refresh();
        } else {
          toast.success("Account request submitted. Check your inbox to activate your account if email confirmation is enabled.");
        }
      } else {
        const result = await Promise.race([
          supabase.auth.signInWithPassword({email:email.trim(),password}),
          timeout
        ]);
        if(result.error) throw result.error;
        await fetch("/api/customer/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
        router.replace("/account?welcome=1");
        router.refresh();
      }
    } catch(e) {
      const message = e instanceof Error ? e.message : "Authentication failed. Please try again.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    
    const timer = window.setTimeout(() => {
      setBusy(false);
      toast.error("Google sign-in did not start. Check Supabase Google provider and redirect URL settings, then try again.");
    }, 15000);
    try {
      const {error}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/auth/callback"}});
      if(error) throw error;
    } catch(e) {
      toast.error(e instanceof Error?e.message:"Google sign-in failed.");
      setBusy(false);
    } finally {
      window.clearTimeout(timer);
    }
  }
  async function signOut(){const {error}=await createSupabaseBrowserClient().auth.signOut();if(error){toast.error(error.message);return;}router.refresh();toast.success("Signed out.");}
  return <main className="customer-account-page"><a href="/" className="account-back">← NEXORA Store</a><section className="customer-account-card"><div className="account-brand">NEXORA<span> STORE</span></div><div className="account-icon"><UserRound size={22}/></div><p className="account-eyebrow">CUSTOMER ACCOUNT</p><h1>{mode==="login"?"Welcome back":"Create your account"}</h1><p className="account-intro">{mode==="login"?"Sign in to your NEXORA customer account.":"Create an account to keep your details and order history together."}</p>
  <button type="button" className="account-google" onClick={google} disabled={busy}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.37 37.99 46.98 31.95 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg> Continue with Google</button><div className="account-divider"><span>or use email</span></div>
  <form onSubmit={submit}>{mode==="signup"&&<><label>Full name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label></>}<label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"}/></label><button type="submit" className="account-submit" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"} <ArrowRight size={16}/></button></form>
  <p className="account-switch">{mode==="login"?"New to NEXORA?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");}}>{mode==="login"?"Create account":"Sign in"}</button></p><a className="account-admin-link" href="/admin/login"><LockKeyhole size={13}/> Administrator sign-in</a></section><p className="account-terms">Your account is secured by Supabase Authentication.</p></main>
}