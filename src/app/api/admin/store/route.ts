import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getStoreDatabase,
  ensureStoreDatabaseLoaded,
  persistStoreDatabase,
  recordOrderInStore,
  resetStoreToDefaults,
  scanPublicMediaLibrary,
  getStoragePathsInfo,
  StoreDatabase,
  MediaAsset
} from "@/lib/store/adminStore";
import { OrderRecord } from "@/lib/types/checkout";
import { sendShippingDispatchEmail } from "@/lib/email/emailService";
import {
  generateTrackingData,
  saveTrackingRecord
} from "@/lib/shipping/trackingService";
import {
  deleteFromVercelBlob,
  deleteFromCloudinary,
  deleteFromSupabaseStorage,
  deleteFromOciObjectStorage
} from "@/lib/storage/ociStorage";
import { getMongoStatus } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await ensureStoreDatabaseLoaded();
    const mediaLibrary = scanPublicMediaLibrary(
      db.customMedia || [],
      db.deletedMediaUrls || []
    );
    const storagePaths = getStoragePathsInfo();
    return NextResponse.json({
      ...db,
      mediaLibrary,
      storagePaths,
      mongoStatus: getMongoStatus()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load store data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<StoreDatabase> & {
      action?: string;
    };

    if (body.action === "reset") {
      const resetDb = resetStoreToDefaults();
      await persistStoreDatabase(resetDb);
      const mediaLibrary = scanPublicMediaLibrary(
        resetDb.customMedia || [],
        resetDb.deletedMediaUrls || []
      );
      const storagePaths = getStoragePathsInfo();
      return NextResponse.json({
        success: true,
        message: "Store reset to factory defaults.",
        data: { ...resetDb, mediaLibrary, storagePaths }
      });
    }

    const db = await ensureStoreDatabaseLoaded();

    if (Array.isArray(body.products)) {
      db.products = body.products;
    }
    if (Array.isArray(body.beachMoments)) {
      db.beachMoments = body.beachMoments;
    }
    if (body.settings) {
      db.settings = { ...db.settings, ...body.settings };
    }
    if (body.socialAutomation) {
      db.socialAutomation = { ...db.socialAutomation, ...body.socialAutomation };
    }
    if (Array.isArray(body.orders)) {
      db.orders = body.orders;
    }
    if (Array.isArray(body.customMedia)) {
      db.customMedia = body.customMedia;
    }

    const saved = await persistStoreDatabase(db);
    const mediaLibrary = scanPublicMediaLibrary(
      saved.customMedia || [],
      saved.deletedMediaUrls || []
    );
    const storagePaths = getStoragePathsInfo();

    return NextResponse.json({
      success: true,
      message: "Store configuration saved and published live.",
      data: { ...saved, mediaLibrary, storagePaths }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save store data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    const db = await ensureStoreDatabaseLoaded();

    if (action === "record_order") {
      const { order } = body as { order: OrderRecord };
      if (!order || !order.orderId) {
        return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
      }
      const savedOrder = recordOrderInStore(order);
      return NextResponse.json({
        success: true,
        order: savedOrder,
        orders: getStoreDatabase().orders
      });
    }

    if (action === "update_order") {
      const {
        orderId,
        status,
        courierName,
        trackingNumber,
        estimatedDelivery,
        orderNotes,
        sendDispatchEmail = false
      } = body as {
        orderId: string;
        status?: OrderRecord["status"];
        courierName?: string;
        trackingNumber?: string;
        estimatedDelivery?: string;
        orderNotes?: string;
        sendDispatchEmail?: boolean;
      };

      const idx = db.orders.findIndex((o) => o.orderId === orderId);
      if (idx === -1) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const existing = db.orders[idx];
      const updatedShipping = {
        courierName:
          courierName || existing.shipping?.courierName || "Blue Dart Express",
        trackingNumber:
          trackingNumber ||
          existing.shipping?.trackingNumber ||
          `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
        trackingUrl:
          existing.shipping?.trackingUrl ||
          `http://localhost:3000/track?orderId=${existing.orderId}`,
        estimatedDelivery:
          estimatedDelivery ||
          existing.shipping?.estimatedDelivery ||
          "2-3 Business Days",
        dispatchedAt:
          status === "dispatched"
            ? new Date().toISOString()
            : existing.shipping?.dispatchedAt
      };

      const updatedOrder: OrderRecord = {
        ...existing,
        status: status || existing.status,
        customer: {
          ...existing.customer,
          orderNotes:
            orderNotes !== undefined ? orderNotes : existing.customer.orderNotes
        },
        shipping: updatedShipping
      };

      db.orders[idx] = updatedOrder;
      await persistStoreDatabase(db);

      // Sync tracking milestones
      const trackRec = generateTrackingData(
        updatedOrder.orderId,
        updatedOrder.customer.city,
        updatedOrder.customer.state,
        updatedOrder.customer.pincode,
        updatedOrder.customer.fullName
      );
      trackRec.courierName = updatedShipping.courierName;
      trackRec.trackingNumber = updatedShipping.trackingNumber;
      if (updatedOrder.status === "delivered") {
        trackRec.currentStatus = "delivered";
        trackRec.statusBadge = "Delivered — Confirmed";
        trackRec.milestones = trackRec.milestones.map((m) => ({
          ...m,
          isCompleted: true,
          isCurrent: m.stage === "delivered"
        }));
      } else if (updatedOrder.status === "dispatched") {
        trackRec.currentStatus = "dispatched";
        trackRec.statusBadge = `Dispatched via ${updatedShipping.courierName}`;
      }
      saveTrackingRecord(trackRec);

      if (sendDispatchEmail && updatedOrder.customer?.email) {
        await sendShippingDispatchEmail({
          order: updatedOrder,
          trackingNumber: updatedShipping.trackingNumber,
          courierName: updatedShipping.courierName,
          trackingUrl: updatedShipping.trackingUrl
        });
      }

      return NextResponse.json({
        success: true,
        message: sendDispatchEmail
          ? `Order ${orderId} updated & dispatch email sent to ${updatedOrder.customer.email}`
          : `Order ${orderId} updated successfully.`,
        order: updatedOrder,
        orders: db.orders
      });
    }

    if (action === "delete_order") {
      const { orderId } = body as { orderId: string };
      db.orders = db.orders.filter((o) => o.orderId !== orderId);
      await persistStoreDatabase(db);
      return NextResponse.json({
        success: true,
        message: `Order ${orderId} removed.`,
        orders: db.orders
      });
    }

    if (action === "add_media_url") {
      const { url, name, type, category } = body as {
        url: string;
        name?: string;
        type?: "image" | "video";
        category?: MediaAsset["category"];
      };
      if (!url) {
        return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
      }
      const inferredType =
        type ||
        (url.match(/\.(mp4|webm|mov)(\?|$)/i) ? "video" : "image");
      const newAsset: MediaAsset = {
        id: `custom-${Date.now()}`,
        url: url.trim(),
        name: name?.trim() || url.split("/").pop() || "Custom Media",
        type: inferredType,
        category: category || (inferredType === "video" ? "video" : "lifestyle"),
        folder: "External URL",
        diskPath: url.trim(),
        createdAt: new Date().toISOString()
      };
      db.customMedia = [newAsset, ...(db.customMedia || [])];
      db.deletedMediaUrls = (db.deletedMediaUrls || []).filter(
        (u) => u !== newAsset.url && u !== newAsset.name
      );
      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls || []
      );
      return NextResponse.json({
        success: true,
        asset: newAsset,
        mediaLibrary
      });
    }

    if (action === "delete_media") {
      const { assetId, url, name, diskPath } = body as {
        assetId?: string;
        url: string;
        name?: string;
        diskPath?: string;
      };

      if (!url) {
        return NextResponse.json(
          { error: "Media URL is required to delete" },
          { status: 400 }
        );
      }

      let deletedFromDiskOrCloud = false;

      // 1. Delete physical file from /public/uploads if local upload
      if (url.startsWith("/uploads/")) {
        const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
        const safeFileName = path.basename(url);
        const candidatePath = path.resolve(uploadsDir, safeFileName);
        if (
          candidatePath.startsWith(uploadsDir) &&
          fs.existsSync(candidatePath)
        ) {
          fs.unlinkSync(candidatePath);
          deletedFromDiskOrCloud = true;
        }
      }

      // 2. Delete from Cloudinary, Vercel Blob, Supabase Storage, or OCI Object Storage
      if (url.includes(".vercel-storage.com")) {
        try {
          const removedBlob = await deleteFromVercelBlob(url);
          if (removedBlob) deletedFromDiskOrCloud = true;
        } catch (blobErr) {
          console.warn("[AdminStore] Vercel Blob delete warning:", blobErr);
        }
      } else if (
        url.includes("res.cloudinary.com") ||
        (diskPath && diskPath.startsWith("apoorva/"))
      ) {
        try {
          const removedCloudinary = await deleteFromCloudinary(url, diskPath);
          if (removedCloudinary) deletedFromDiskOrCloud = true;
        } catch (cldErr) {
          console.warn("[AdminStore] Cloudinary delete warning:", cldErr);
        }
      } else if (url.includes("/storage/v1/object/")) {
        try {
          const removedSupa = await deleteFromSupabaseStorage(url, diskPath);
          if (removedSupa) deletedFromDiskOrCloud = true;
        } catch (supaErr) {
          console.warn("[AdminStore] Supabase delete warning:", supaErr);
        }
      } else if (
        url.includes(".oraclecloud.com/") ||
        (diskPath && diskPath.startsWith("uploads/"))
      ) {
        try {
          const removedOci = await deleteFromOciObjectStorage(diskPath || url);
          if (removedOci) deletedFromDiskOrCloud = true;
        } catch (ociErr) {
          console.warn("[AdminStore] OCI delete warning:", ociErr);
        }
      }

      // 3. Remove from db.customMedia & record in deletedMediaUrls so it stays deleted
      const fileBaseName = name || url.split("/").pop() || "";
      db.customMedia = (db.customMedia || []).filter(
        (m) => m.url !== url && m.id !== assetId && m.name !== fileBaseName
      );
      const nextDeleted = new Set(db.deletedMediaUrls || []);
      nextDeleted.add(url);
      if (fileBaseName) {
        nextDeleted.add(fileBaseName);
        nextDeleted.add(`/images/${fileBaseName}`);
        nextDeleted.add(`/videos/${fileBaseName}`);
      }
      db.deletedMediaUrls = Array.from(nextDeleted);

      // 4. Clean up references in product galleries so there are no broken links
      db.products = db.products.map((prod) => ({
        ...prod,
        gallery: (prod.gallery || []).filter(
          (gUrl) => gUrl !== url && !gUrl.endsWith(`/${fileBaseName}`)
        )
      }));

      await persistStoreDatabase(db);
      const mediaLibrary = scanPublicMediaLibrary(
        db.customMedia,
        db.deletedMediaUrls
      );

      return NextResponse.json({
        success: true,
        deletedFromDiskOrCloud,
        message: deletedFromDiskOrCloud
          ? `Deleted ${fileBaseName || "media"} from Cloudinary & MongoDB!`
          : `Removed ${fileBaseName || "media"} from library & MongoDB!`,
        mediaLibrary,
        products: db.products
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Admin action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
