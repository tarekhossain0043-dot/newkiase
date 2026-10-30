"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowRight, Chrome, LockKeyhole, UserRound } from "lucide-react";
export default function CustomerAccountPage() {
  const router = useRouter();
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [phone,setPhone] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
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
          router.replace("/account?welcome=1");
          router.refresh();
        } else {
          setNotice("Account request submitted. If email confirmation is enabled, check your inbox to activate the account before signing in.");
        }
      } else {
        const result = await Promise.race([
          supabase.auth.signInWithPassword({email:email.trim(),password}),
          timeout
        ]);
        if(result.error) throw result.error;
        router.replace("/account?welcome=1");
        router.refresh();
      }
    } catch(e) {
      const message = e instanceof Error ? e.message : "Authentication failed. Please try again.";
      setNotice(message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    const timer = window.setTimeout(() => {
      setBusy(false);
      setNotice("Google sign-in did not start. Check Supabase Google provider and redirect URL settings, then try again.");
    }, 15000);
    try {
      const {error}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/auth/callback"}});
      if(error) throw error;
    } catch(e) {
      setNotice(e instanceof Error?e.message:"Google sign-in failed.");
      setBusy(false);
    } finally {
      window.clearTimeout(timer);
    }
  }
  async function signOut(){await createSupabaseBrowserClient().auth.signOut();router.refresh();setNotice("Signed out.");}
  return <main className="customer-account-page"><a href="/" className="account-back">← NEXORA Store</a><section className="customer-account-card"><div className="account-brand">NEXORA<span> STORE</span></div><div className="account-icon"><UserRound size={22}/></div><p className="account-eyebrow">CUSTOMER ACCOUNT</p><h1>{mode==="login"?"Welcome back":"Create your account"}</h1><p className="account-intro">{mode==="login"?"Sign in to your NEXORA customer account.":"Create an account to keep your details and order history together."}</p>
  <button type="button" className="account-google" onClick={google} disabled={busy}><Chrome size={17}/> Continue with Google</button><div className="account-divider"><span>or use email</span></div>
  <form onSubmit={submit}>{mode==="signup"&&<><label>Full name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label></>}<label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"}/></label>{notice&&<p className="account-notice" role="status">{notice}</p>}<button type="submit" className="account-submit" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"} <ArrowRight size={16}/></button></form>
  <p className="account-switch">{mode==="login"?"New to NEXORA?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setNotice("");}}>{mode==="login"?"Create account":"Sign in"}</button></p><a className="account-admin-link" href="/admin/login"><LockKeyhole size={13}/> Administrator sign-in</a></section><p className="account-terms">Your account is secured by Supabase Authentication.</p></main>
}