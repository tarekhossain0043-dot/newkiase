import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const productId = new URL(request.url).searchParams.get("product_id");
    if (!productId) return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("product_reviews").select("id,customer_name,rating,comment,media_urls,created_at").eq("product_id", productId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ reviews: (data || []).map((r: any) => ({ id:r.id, name:r.customer_name, rating:r.rating, comment:r.comment, media_urls:r.media_urls||[], date:new Date(r.created_at).toLocaleDateString("en-GB"), created_at:r.created_at })) });
  } catch (error) {
    console.error("[product-reviews] GET failed:", error);
    return NextResponse.json({ error: "Could not load product reviews." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");
    const body = isMultipart ? await request.formData() : await request.json();
    const getText = (key: string) => {
      const value = isMultipart ? body.get(key) : body[key];
      return typeof value === "string" ? value : "";
    };
    const productId = getText("product_id");
    const name = getText("name").trim().slice(0,70);
    const comment = getText("comment").trim().slice(0,1000);
    const rating = Number(getText("rating"));
    const mediaFiles: File[] = isMultipart ? (body as FormData).getAll("media").filter((item: FormDataEntryValue): item is File => item instanceof File && item.size > 0) : [];
    if (!productId || !name || comment.length < 5 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Enter your name, a 5–1000 character review and a rating from 1 to 5." }, { status: 400 });
    }
    if (mediaFiles.length > 4) return NextResponse.json({ error: "You can attach up to 4 photos or videos." }, { status: 400 });
    const allowed = new Set(["image/jpeg","image/png","image/webp","image/avif","video/mp4","video/webm","video/quicktime"]);
    for (const file of mediaFiles) {
      const isVideo = file.type.startsWith("video/");
      if (!allowed.has(file.type) || file.size > (isVideo ? 30 : 8) * 1024 * 1024) {
        return NextResponse.json({ error: isVideo ? "Each video must be 30 MB or smaller and use MP4, WebM or MOV." : "Each photo must be 8 MB or smaller and use JPG, PNG, WebP or AVIF." }, { status: 400 });
      }
    }
    const db = createSupabaseServiceClient();
    const { data: product, error: productError } = await db.from("products").select("id,name,status").eq("id", productId).eq("status", "active").maybeSingle();
    if (productError || !product) return NextResponse.json({ error: "This product is unavailable for review." }, { status: 404 });
    const mediaUrls: string[] = [];
    for (const file of mediaFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (file.type.startsWith("video/") ? "mp4" : "jpg");
      const path = productId + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await db.storage.from("product-review-media").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = db.storage.from("product-review-media").getPublicUrl(path);
      mediaUrls.push(publicUrl.publicUrl);
    }
    const { data: review, error } = await db.from("product_reviews").insert({ product_id: productId, customer_name: name, rating, comment, media_urls: mediaUrls }).select("id,customer_name,rating,comment,media_urls,created_at").single();
    if (error) throw error;
    const { error: notificationError } = await db.from("admin_notifications").insert({
      type: "review", title: "New product review",
      description: name + " reviewed " + product.name + " · " + rating + "/5 stars",
      reference_id: review.id
    });
    if (notificationError) console.error("[product-reviews] notification insert failed:", notificationError);
    return NextResponse.json({ review: { id:review.id, name:review.customer_name, rating:review.rating, comment:review.comment, media_urls:review.media_urls||[], date:new Date(review.created_at).toLocaleDateString("en-GB"), created_at:review.created_at } }, { status: 201 });
  } catch (error) {
    console.error("[product-reviews] POST failed:", error);
    return NextResponse.json({ error: "Could not submit your review." }, { status: 500 });
  }
}
