import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function setHumanTakeover(psid: string) {
  const db = createSupabaseServiceClient();
  const { error } = await db.from("messenger_conversations").upsert({
    psid, ai_enabled: false, handoff_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }, { onConflict: "psid" });
  if (error) throw error;
}

async function getOrCreateConversation(psid: string) {
  const db = createSupabaseServiceClient();
  const { data, error } = await db.from("messenger_conversations").select("ai_enabled")
    .eq("psid", psid).maybeSingle();
  if (error) throw error;
  if (data) {
    await db.from("messenger_conversations").update({
      last_customer_message_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("psid", psid);
    return data.ai_enabled !== false;
  }
  const { error: insertError } = await db.from("messenger_conversations").insert({
    psid, ai_enabled: true, last_customer_message_at: new Date().toISOString()
  });
  if (insertError && insertError.code !== "23505") throw insertError;
  const { data: current, error: reloadError } = await db.from("messenger_conversations")
    .select("ai_enabled").eq("psid", psid).single();
  if (reloadError) throw reloadError;
  return current.ai_enabled !== false;
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
  if (!appSecret || !pageToken || !process.env.OPENAI_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Messenger integration is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (payload.object !== "page") return NextResponse.json({ received: true });

  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      // A human reply sent from Meta Business Suite arrives as an echo.
      // Pause AI for that PSID so it never talks over the human agent.
      if (event.message?.is_echo) {
        const psid = event.recipient?.id;
        if (psid) {
          try { await setHumanTakeover(psid); }
          catch (error) { console.error("Could not activate human takeover:", error); }
        }
        continue;
      }

      const senderId = event.sender?.id;
      const messageText = event.message?.text;
      if (!senderId || !messageText) continue;

      let aiEnabled = false;
      try {
        aiEnabled = await getOrCreateConversation(senderId);
      } catch (error) {
        // Fail closed: never send AI if handoff state cannot be checked.
        console.error("Could not read Messenger handoff state; AI reply skipped:", error);
        continue;
      }
      if (!aiEnabled) {
        console.info("AI is paused for human-managed conversation:", senderId);
        continue;
      }

      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const ai = await fetch(new URL("/api/customer-support/chat", origin), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: String(messageText).slice(0, 1200) }] }),
          cache: "no-store",
          signal: AbortSignal.timeout(50000)
        });
        const answer = await ai.json();
        if (!ai.ok || typeof answer.reply !== "string") {
          console.error("NEXORA AI reply generation failed:", ai.status, answer);
          continue;
        }

        const sent = await fetch("https://graph.facebook.com/v21.0/me/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
          body: JSON.stringify({
            recipient: { id: senderId },
            messaging_type: "RESPONSE",
            message: { text: answer.reply.slice(0, 1900) }
          }),
          cache: "no-store"
        });
        if (!sent.ok) console.error("Messenger Send API failed:", sent.status, await sent.text());
        else console.info("NEXORA AI Messenger reply sent:", senderId);
      } catch (error) {
        console.error("Messenger event processing failed:", error);
      }
    }
  }
  return NextResponse.json({ received: true });
}
