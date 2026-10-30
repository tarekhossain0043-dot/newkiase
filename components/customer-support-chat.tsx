"use client";

import { FormEvent, useState } from "react";
import { Bot, MessageCircle, Send, X, LoaderCircle, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function CustomerSupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "আসসালামু আলাইকুম! আমি NEXORA AI Assistant। পণ্যের দাম, সাইজ, স্টক বা অর্ডার সম্পর্কে কী জানতে চান?" }
  ]);
  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const response = await fetch("/api/customer-support/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send message");
      setMessages(current => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages(current => [...current, { role: "assistant", content: error instanceof Error ? error.message : "দুঃখিত, এই মুহূর্তে উত্তর দেওয়া যাচ্ছে না। Messenger-এ যোগাযোগ করুন।" }]);
    } finally { setBusy(false); }
  }
  return <>
    <button className="nexora-ai-launcher" onClick={() => setOpen(v => !v)} aria-label={open ? "Close AI support" : "Open AI support"}>
      {open ? <X size={23}/> : <><Bot size={22}/><span>AI Support</span><i/></>}
    </button>
    {open && <section className="nexora-ai-panel" aria-label="NEXORA AI customer support">
      <header className="nexora-ai-header"><span className="nexora-ai-avatar"><Sparkles size={19}/></span><span><b>NEXORA Assistant</b><small><i/> Online · Live store information</small></span><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={19}/></button></header>
      <div className="nexora-ai-messages">{messages.map((m,i)=><div key={i} className={m.role==="user"?"nexora-ai-user":"nexora-ai-bot"}>{m.content}</div>)}{busy&&<div className="nexora-ai-bot nexora-ai-typing"><LoaderCircle size={15}/> লিখছে...</div>}</div>
      <form className="nexora-ai-form" onSubmit={sendMessage}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন..." maxLength={1200} disabled={busy}/><button type="submit" disabled={busy||!input.trim()} aria-label="Send message"><Send size={18}/></button></form>
      <a className="nexora-ai-messenger" href="https://m.me/61593737953583" target="_blank" rel="noreferrer"><MessageCircle size={14}/> প্রয়োজনে Messenger-এ কথা বলুন</a>
    </section>}
  </>;
}
