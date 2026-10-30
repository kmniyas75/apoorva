import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getStoreDatabase,
  saveStoreDatabase,
  scanPublicMediaLibrary,
  MediaAsset
} from "@/lib/store/adminStore";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const baseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const safeFileName = `${baseName}_${Date.now().toString().slice(-5)}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const isVideo = [".mp4", ".webm", ".mov"].includes(ext);
    const publicUrl = `/uploads/${safeFileName}`;

    const asset: MediaAsset = {
      id: `upload-${safeFileName}`,
      url: publicUrl,
      name: safeFileName,
      type: isVideo ? "video" : "image",
      category: "upload",
      folder: "public/uploads",
      diskPath: filePath,
      sizeKB: Math.round(buffer.length / 1024),
      createdAt: new Date().toISOString()
    };

    const db = getStoreDatabase();
    const mediaLibrary = scanPublicMediaLibrary(db.customMedia || []);
    saveStoreDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Saved ${safeFileName} to ${filePath}`,
      asset,
      mediaLibrary
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
