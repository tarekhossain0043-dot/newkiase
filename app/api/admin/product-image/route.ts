import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file first." }, { status: 400 });
    }
    const extension = allowedTypes[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Use a JPG, PNG, WEBP or AVIF image." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 5 MB." }, { status: 413 });
    }

    const storage = createSupabaseServiceClient().storage;
    const { data: buckets, error: listError } = await storage.listBuckets();
    if (listError) throw listError;
    if (!buckets.some((bucket) => bucket.name === BUCKET)) {
      const { error: createError } = await storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Object.keys(allowedTypes),
      });
      if (createError && !createError.message.toLowerCase().includes("already exists")) throw createError;
    }

    const safeBase = file.name.split(".").slice(0, -1).join(".").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").slice(0, 50) || "product";
    const path = `${Date.now()}-${crypto.randomUUID()}-${safeBase}.${extension}`;
    const { error: uploadError } = await storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ image_url: data.publicUrl, path }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Supabase is not configured") || message.includes("server service key is not configured")) {
      return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 503 });
    }
    return NextResponse.json({ error: "Image upload failed. Check Supabase Storage configuration and server logs." }, { status: 500 });
  }
}
