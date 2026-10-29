"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, Save, ShieldCheck, UserRound, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = { full_name: string; phone: string; bio: string; hobbies: string; email: string };
export default function AdminAccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "", bio: "", hobbies: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<{type:"success"|"error";text:string}|null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/profile", { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load account settings."); return d.profile; })
      .then((p) => { if (alive && p) { setProfile({ full_name: p.full_name || "", phone: p.phone || "", bio: p.bio || "", hobbies: p.hobbies || "", email: p.email || "" }); setNewEmail(p.email || ""); } })
      .catch((e) => { if (alive) setNotice({type:"error",text:e instanceof Error ? e.message : "Could not load account settings."}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/profile", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone, bio: profile.bio, hobbies: profile.hobbies }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save profile.");
      setNotice({type:"success",text:"Profile details saved successfully."});
    } catch (e) { setNotice({type:"error",text:e instanceof Error ? e.message : "Could not save profile."}); }
    finally { setSaving(false); }
  }

  async function updateEmail(e: FormEvent) {
    e.preventDefault(); setSaving(true); setNotice(null);
    try {
      if (!newEmail.trim() || !newEmail.includes("@")) throw new Error("Enter a valid email address.");
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setNotice({type:"success",text:"Email update requested. Check your inbox and follow the Supabase confirmation email if confirmation is enabled."});
    } catch (e) { setNotice({type:"error",text:e instanceof Error ? e.message : "Could not update email."}); }
    finally { setSaving(false); }
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault(); setChangingPassword(true); setNotice(null);
    try {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (password !== confirmPassword) throw new Error("The passwords do not match.");
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirmPassword("");
      setNotice({type:"success",text:"Password updated successfully. Use the new password next time you sign in."});
    } catch (e) { setNotice({type:"error",text:e instanceof Error ? e.message : "Could not update password."}); }
    finally { setChangingPassword(false); }
  }

  return <main className="account-settings-page">
    <header className="account-settings-top"><button type="button" className="account-settings-back" onClick={() => router.push("/admin")}><ArrowLeft size={17}/> Back to dashboard</button><div className="account-settings-brand">NEXORA <span>ADMIN</span></div></header>
    <section className="account-settings-heading"><span className="admin-eyebrow">NEXORA COMMERCE SUITE</span><h1>Account settings</h1><p>Manage your administrator profile, sign-in email, and password.</p></section>
    {notice && <div className={"account-settings-notice "+notice.type}>{notice.type === "success" ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}<span>{notice.text}</span></div>}
    {loading ? <div className="account-settings-card">Loading account settings…</div> : <div className="account-settings-grid">
      <section className="account-settings-card"><div className="account-settings-card-title"><span><UserRound size={19}/></span><div><h2>Profile information</h2><p>Details shown in your admin profile.</p></div></div>
        <form className="account-settings-form" onSubmit={saveProfile}>
          <label>Full name<input required maxLength={120} value={profile.full_name} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></label>
          <label>Phone number<input maxLength={40} value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+880…"/></label>
          <label>Bio<textarea rows={3} maxLength={1000} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="A short introduction"/></label>
          <label>Hobbies<input maxLength={500} value={profile.hobbies} onChange={e=>setProfile({...profile,hobbies:e.target.value})} placeholder="e.g. technology, design"/></label>
          <button className="admin-primary-btn" disabled={saving}><Save size={15}/>{saving?"Saving…":"Save profile"}</button>
        </form>
      </section>
      <section className="account-settings-card"><div className="account-settings-card-title"><span><Mail size={19}/></span><div><h2>Sign-in email</h2><p>Change the email used for administrator login.</p></div></div>
        <form className="account-settings-form" onSubmit={updateEmail}><label>Current email<input value={profile.email} readOnly/></label><label>New email address<input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="admin@example.com"/></label><p className="account-settings-help">Supabase may send a confirmation link before the new email becomes active.</p><button className="admin-primary-btn" disabled={saving || newEmail.trim().toLowerCase()===profile.email.trim().toLowerCase()}><Mail size={15}/>{saving?"Processing…":"Update email"}</button></form>
      </section>
      <section className="account-settings-card"><div className="account-settings-card-title"><span><KeyRound size={19}/></span><div><h2>Change password</h2><p>Choose a strong password with at least 8 characters.</p></div></div>
        <form className="account-settings-form" onSubmit={updatePassword}><label>New password<div className="account-settings-password"><input type={showPassword?"text":"password"} required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter new password"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><label>Confirm new password<input type={showPassword?"text":"password"} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat new password"/></label><p className="account-settings-help">If your project has additional Supabase password policies, those will also apply.</p><button className="admin-primary-btn" disabled={changingPassword}><ShieldCheck size={15}/>{changingPassword?"Updating…":"Update password"}</button></form>
      </section>
    </div>}
  </main>;
}
