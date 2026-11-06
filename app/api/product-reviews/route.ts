import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const productId = new URL(request.url).searchParams.get("product_id");
    if (!productId) return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("product_reviews").select("id,customer_name,rating,comment,created_at").eq("product_id", productId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ reviews: (data || []).map((r: any) => ({ id:r.id, name:r.customer_name, rating:r.rating, comment:r.comment, date:new Date(r.created_at).toLocaleDateString("en-GB"), created_at:r.created_at })) });
  } catch (error) {
    console.error("[product-reviews] GET failed:", error);
    return NextResponse.json({ error: "Could not load product reviews." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0,70) : "";
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0,1000) : "";
    const rating = Number(body.rating);
    if (!productId || !name || comment.length < 5 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Enter your name, a 5–1000 character review and a rating from 1 to 5." }, { status: 400 });
    }
    const db = createSupabaseServiceClient();
    const { data: product, error: productError } = await db.from("products").select("id,name,status").eq("id", productId).eq("status", "active").maybeSingle();
    if (productError || !product) return NextResponse.json({ error: "This product is unavailable for review." }, { status: 404 });
    const { data: review, error } = await db.from("product_reviews").insert({ product_id: productId, customer_name: name, rating, comment }).select("id,customer_name,rating,comment,created_at").single();
    if (error) throw error;
    const { error: notificationError } = await db.from("admin_notifications").insert({
      type: "review", title: "New product review",
      description: name + " reviewed " + product.name + " · " + rating + "/5 stars",
      reference_id: review.id
    });
    if (notificationError) console.error("[product-reviews] notification insert failed:", notificationError);
    return NextResponse.json({ review: { id:review.id, name:review.customer_name, rating:review.rating, comment:review.comment, date:new Date(review.created_at).toLocaleDateString("en-GB"), created_at:review.created_at } }, { status: 201 });
  } catch (error) {
    console.error("[product-reviews] POST failed:", error);
    return NextResponse.json({ error: "Could not submit your review." }, { status: 500 });
  }
}
