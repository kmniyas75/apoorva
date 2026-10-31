import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getStoreDatabase,
  saveStoreDatabase,
  scanPublicMediaLibrary,
  MediaAsset
} from "@/lib/store/adminStore";
import {
  getOciStorageConfig,
  uploadToOciObjectStorage
} from "@/lib/storage/ociStorage";

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
    const isVideo = [".mp4", ".webm", ".mov"].includes(ext);
    const sizeKB = Math.round(buffer.length / 1024);

    const ociCfg = getOciStorageConfig();
    const db = getStoreDatabase();

    // 1. If Oracle Cloud (OCI) Always Free Object Storage is configured, upload to OCI bucket
    if (ociCfg.enabled) {
      const objectKey = `uploads/${safeFileName}`;
      const contentType =
        file.type || (isVideo ? "video/mp4" : "image/jpeg");

      const { publicUrl } = await uploadToOciObjectStorage({
        objectKey,
        buffer,
        contentType
      });

      const asset: MediaAsset = {
        id: `oci-${safeFileName}`,
        url: publicUrl,
        name: safeFileName,
        type: isVideo ? "video" : "image",
        category: "upload",
        folder: `OCI Bucket (${ociCfg.bucket})`,
        diskPath: objectKey,
        sizeKB,
        createdAt: new Date().toISOString()
      };

      db.customMedia = [
        asset,
        ...(db.customMedia || []).filter((m) => m.url !== publicUrl)
      ];
      saveStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(db.customMedia);

      return NextResponse.json({
        success: true,
        message: `Uploaded ${safeFileName} to OCI Object Storage (${ociCfg.bucket})`,
        asset,
        mediaLibrary
      });
    }

    // 2. Local Disk Fallback (/public/uploads)
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFileName}`;

    const asset: MediaAsset = {
      id: `upload-${safeFileName}`,
      url: publicUrl,
      name: safeFileName,
      type: isVideo ? "video" : "image",
      category: "upload",
      folder: "public/uploads",
      diskPath: filePath,
      sizeKB,
      createdAt: new Date().toISOString()
    };

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
