import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    // Admin authorization is checked above; use the server-only service client
    // so customer/order reads are not silently restricted by customer RLS policies.
    const supabase = createSupabaseServiceClient();
    const [{ data: profiles, error: profileError }, { data: orders, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,phone,role,created_at").eq("role", "customer").order("created_at", { ascending: false }).limit(2000),
      supabase.from("orders").select("id,customer_id,customer_name,customer_email,customer_phone,total,status,created_at").order("created_at", { ascending: false }).limit(10000),
    ]);
    if (profileError) { console.error("[admin/customers] profiles query failed:", profileError); throw profileError; }
    if (orderError) { console.error("[admin/customers] orders query failed:", orderError); throw orderError; }
    const grouped = new Map<string, any>();
    const aliases = new Map<string, string>();
    for (const profile of profiles || []) {
      const key = String(profile.id);
      grouped.set(key,{id:profile.id,full_name:profile.full_name||"Customer",email:profile.email||"",phone:profile.phone||"",role:profile.role,created_at:profile.created_at,orderCount:0,totalSpent:0,lastOrderAt:null});
      aliases.set(key,key);
      if(profile.email) aliases.set("email:"+String(profile.email).toLowerCase(),key);
      if(profile.phone) aliases.set("phone:"+String(profile.phone).replace(/\D/g,""),key);
    }
    for (const order of orders || []) {
      const candidates=[order.customer_id,order.customer_email?"email:"+String(order.customer_email).toLowerCase():"",order.customer_phone?"phone:"+String(order.customer_phone).replace(/\D/g,""):""].filter(Boolean);
      const matchedKey=candidates.map((candidate:string)=>aliases.get(candidate)||candidate).find((candidate:string)=>grouped.has(candidate));
      const fallbackKey=order.customer_id
        ? String(order.customer_id)
        : order.customer_email
          ? "email:"+String(order.customer_email).toLowerCase()
          : order.customer_phone
            ? "phone:"+String(order.customer_phone).replace(/\D/g,"")
            : "order:"+String(order.id ?? order.created_at ?? "unknown");
      const key: string = matchedKey ?? fallbackKey;
      let row=grouped.get(key);
      if(!row){row={id:key,full_name:order.customer_name||"Guest customer",email:order.customer_email||"",phone:order.customer_phone||"",role:"guest",created_at:order.created_at,orderCount:0,totalSpent:0,lastOrderAt:null};grouped.set(key,row);}
      for(const candidate of candidates) if(candidate) aliases.set(String(candidate),key);
      if(!row.full_name||row.full_name==="Customer"||row.full_name==="Guest customer") row.full_name=order.customer_name||row.full_name;
      row.email=row.email||order.customer_email||""; row.phone=row.phone||order.customer_phone||"";
      row.orderCount+=1;
      if(!["cancelled","returned"].includes(String(order.status).toLowerCase())) row.totalSpent+=Number(order.total||0);
      if(!row.lastOrderAt||new Date(order.created_at)>new Date(row.lastOrderAt)) row.lastOrderAt=order.created_at;
    }
    const customers=Array.from(grouped.values()).sort((a,b)=>new Date(b.lastOrderAt||b.created_at||0).getTime()-new Date(a.lastOrderAt||a.created_at||0).getTime());
    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[admin/customers] request failed:", error);
    return NextResponse.json({ error: "Could not load customers. Check server logs and Supabase configuration." }, { status: 500 });
  }
}