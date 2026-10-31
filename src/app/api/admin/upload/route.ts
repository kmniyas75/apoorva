import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  ensureStoreDatabaseLoaded,
  persistStoreDatabase,
  scanPublicMediaLibrary,
  MediaAsset
} from "@/lib/store/adminStore";
import {
  isVercelBlobConfigured,
  uploadToVercelBlob,
  isCloudinaryConfigured,
  uploadToCloudinary,
  isSupabaseStorageConfigured,
  uploadToSupabaseStorage,
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
    const contentType =
      file.type || (isVideo ? "video/mp4" : "image/jpeg");

    const db = await ensureStoreDatabaseLoaded();

    // 1. Vercel Blob (1-Click inside Vercel Dashboard, No Card Needed)
    if (isVercelBlobConfigured()) {
      const { publicUrl, providerLabel } = await uploadToVercelBlob({
        fileName: safeFileName,
        buffer,
        contentType
      });

      const asset: MediaAsset = {
        id: `blob-${safeFileName}`,
        url: publicUrl,
        name: safeFileName,
        type: isVideo ? "video" : "image",
        category: "upload",
        folder: providerLabel,
        diskPath: publicUrl,
        sizeKB,
        createdAt: new Date().toISOString()
      };

      db.customMedia = [
        asset,
        ...(db.customMedia || []).filter((m) => m.url !== publicUrl)
      ];
      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls || []
      );

      return NextResponse.json({
        success: true,
        message: `Uploaded ${safeFileName} to Vercel Blob!`,
        asset,
        mediaLibrary
      });
    }

    // 2. Cloudinary (25 GB Free, Instant Google/GitHub Signup, No Card Needed)
    if (isCloudinaryConfigured()) {
      const { publicUrl, publicId, providerLabel } = await uploadToCloudinary({
        fileName: safeFileName,
        buffer,
        contentType,
        isVideo
      });

      const asset: MediaAsset = {
        id: `cloudinary-${safeFileName}`,
        url: publicUrl,
        name: safeFileName,
        type: isVideo ? "video" : "image",
        category: "upload",
        folder: providerLabel,
        diskPath: publicId,
        sizeKB,
        createdAt: new Date().toISOString()
      };

      db.customMedia = [
        asset,
        ...(db.customMedia || []).filter((m) => m.url !== publicUrl)
      ];
      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls || []
      );

      return NextResponse.json({
        success: true,
        message: `Uploaded ${safeFileName} to Cloudinary!`,
        asset,
        mediaLibrary
      });
    }

    // 3. Supabase Storage (1 GB Free, Instant GitHub Login, No Card Needed)
    if (isSupabaseStorageConfigured()) {
      const { publicUrl, objectKey, providerLabel } =
        await uploadToSupabaseStorage({
          fileName: safeFileName,
          buffer,
          contentType
        });

      const asset: MediaAsset = {
        id: `supabase-${safeFileName}`,
        url: publicUrl,
        name: safeFileName,
        type: isVideo ? "video" : "image",
        category: "upload",
        folder: providerLabel,
        diskPath: objectKey,
        sizeKB,
        createdAt: new Date().toISOString()
      };

      db.customMedia = [
        asset,
        ...(db.customMedia || []).filter((m) => m.url !== publicUrl)
      ];
      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls || []
      );

      return NextResponse.json({
        success: true,
        message: `Uploaded ${safeFileName} to Supabase Storage!`,
        asset,
        mediaLibrary
      });
    }

    // 4. Oracle Cloud (OCI) / S3-Compatible Object Storage
    const ociCfg = getOciStorageConfig();
    if (ociCfg.enabled) {
      const objectKey = `uploads/${safeFileName}`;
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
      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls || []
      );

      return NextResponse.json({
        success: true,
        message: `Uploaded ${safeFileName} to OCI Object Storage (${ociCfg.bucket})`,
        asset,
        mediaLibrary
      });
    }

    // 5. Local Disk Fallback (/public/uploads)
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

    const mediaLibrary = scanPublicMediaLibrary(
      db.customMedia || [],
      db.deletedMediaUrls || []
    );
    await persistStoreDatabase(db);

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
