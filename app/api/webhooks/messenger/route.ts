import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!appSecret || !pageToken || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Messenger integration is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (payload.object !== "page") return NextResponse.json({ received: true });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text || event.message?.is_echo) continue;

      try {
        const ai = await fetch(new URL("/api/customer-support/chat", origin), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: String(text).slice(0, 1200) }] }),
          cache: "no-store"
        });
        const answer = await ai.json();
        const reply = ai.ok && typeof answer.reply === "string"
          ? answer.reply.slice(0, 1900)
          : "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";

        const sent = await fetch("https://graph.facebook.com/v21.0/me/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            messaging_type: "RESPONSE",
            message: { text: reply }
          }),
          cache: "no-store"
        });
        if (!sent.ok) console.error("Messenger send failed:", await sent.text());
      } catch (error) {
        console.error("Messenger event processing failed:", error);
      }
    }
  }
  return NextResponse.json({ received: true });
}
