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
import { OrderRecord, OrderDisputeInfo } from "@/lib/types/checkout";
import { sendShippingDispatchEmail } from "@/lib/email/emailService";
import {
  sendWhatsAppShippingNotification,
  sendWhatsAppTextMessage
} from "@/lib/meta/whatsapp";
import {
  createShiprocketOrder,
  cancelShiprocketOrder,
  checkShiprocketServiceability
} from "@/lib/shipping/shiprocket";
import { refundRazorpayPayment } from "@/lib/payment/razorpay";
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
      const gstPercentage =
        typeof db.settings?.gstPercent === "number" ? db.settings.gstPercent : 12;
      const subtotal = order.pricing?.subtotal || order.pricing?.rawSubtotal || 2499;
      const taxableAmount = Number(
        (subtotal / (1 + gstPercentage / 100)).toFixed(2)
      );
      const gstAmount = Number((subtotal - taxableAmount).toFixed(2));
      let shippingFee = order.pricing?.shippingFee || 0;
      if (!shippingFee && order.customer?.pincode) {
        const srCheck = await checkShiprocketServiceability(
          order.customer.pincode.replace(/\D/g, "")
        );
        shippingFee = srCheck?.shippingRate ?? 95;
      }
      order.pricing = {
        ...order.pricing,
        gstPercentage,
        taxableAmount,
        gstAmount,
        shippingFee,
        total: Number((subtotal + shippingFee).toFixed(2))
      };

      // Push to Shiprocket automatically on manual order creation
      const srRes = await createShiprocketOrder({
        order_id: order.orderId,
        order_date: new Date(order.createdAt || Date.now())
          .toISOString()
          .split("T")[0],
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work",
        billing_customer_name: order.customer.fullName || "Valued Client",
        billing_address:
          order.customer.addressLine1 || "Coastal Delivery Address",
        billing_address_2: order.customer.addressLine2 || "",
        billing_city: order.customer.city || "Kochi",
        billing_pincode: order.customer.pincode || "683101",
        billing_state: order.customer.state || "Kerala",
        billing_country: "India",
        billing_email:
          order.customer.email || "orders@apoorvashells.com",
        billing_phone: order.customer.phone || "9847000000",
        shipping_is_billing: true,
        order_items: order.items.map((i) => ({
          name: i.name,
          sku: i.productId || "APV-SET",
          units: i.quantity || 1,
          selling_price: i.unitPrice || 2499
        })),
        payment_method: "Prepaid",
        sub_total: order.pricing?.total || 2499,
        length: 22,
        breadth: 18,
        height: 12,
        weight: 0.65
      });
      if (srRes.awbCode && order.shipping) {
        order.shipping.trackingNumber = srRes.awbCode;
      }
      if (srRes.courierName && order.shipping) {
        order.shipping.courierName = srRes.courierName;
      }
      if (order.shipping) {
        order.shipping.shiprocketOrderId = srRes.orderId;
        order.shipping.shipmentId = srRes.shipmentId;
        order.shipping.shiprocketStatus = srRes.isSimulated
          ? "SIMULATED"
          : srRes.awbCode
            ? "AWB_ASSIGNED"
            : srRes.orderId
              ? "ORDER_CREATED"
              : "SIMULATED";
      }
      const savedOrder = recordOrderInStore(order);
      await persistStoreDatabase(getStoreDatabase());
      return NextResponse.json({
        success: true,
        order: savedOrder,
        shiprocket: srRes,
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
      let resolvedCourier =
        courierName || existing.shipping?.courierName || "Blue Dart Express";
      let resolvedAwb =
        trackingNumber ||
        existing.shipping?.trackingNumber ||
        `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`;

      let resolvedShiprocketOrderId = existing.shipping?.shiprocketOrderId;
      let resolvedShipmentId = existing.shipping?.shipmentId;
      let resolvedShiprocketStatus = existing.shipping?.shiprocketStatus;
      let stockRestored = existing.stockRestored;

      // If dispatching from Admin, push to Shiprocket if not yet assigned a live AWB
      if (status === "dispatched" && sendDispatchEmail) {
        const srRes = await createShiprocketOrder({
          order_id: existing.orderId,
          order_date: new Date(existing.createdAt || Date.now())
            .toISOString()
            .split("T")[0],
          pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work",
          billing_customer_name: existing.customer.fullName || "Valued Client",
          billing_address:
            existing.customer.addressLine1 || "Coastal Delivery Address",
          billing_address_2: existing.customer.addressLine2 || "",
          billing_city: existing.customer.city || "Kochi",
          billing_pincode: existing.customer.pincode || "683101",
          billing_state: existing.customer.state || "Kerala",
          billing_country: "India",
          billing_email:
            existing.customer.email || "orders@apoorvashells.com",
          billing_phone: existing.customer.phone || "9847000000",
          shipping_is_billing: true,
          order_items: existing.items.map((i) => ({
            name: i.name,
            sku: i.productId || "APV-SET",
            units: i.quantity || 1,
            selling_price: i.unitPrice || 2499
          })),
          payment_method: "Prepaid",
          sub_total: existing.pricing?.subtotal || existing.pricing?.total || 2499,
          shipping_charges: existing.pricing?.shippingFee || 0,
          length: 22,
          breadth: 18,
          height: 12,
          weight: 0.65
        });
        if (srRes.awbCode) resolvedAwb = srRes.awbCode;
        if (srRes.courierName) resolvedCourier = srRes.courierName;
        if (srRes.orderId) resolvedShiprocketOrderId = srRes.orderId;
        if (srRes.shipmentId) resolvedShipmentId = srRes.shipmentId;
        resolvedShiprocketStatus = srRes.awbCode
          ? "AWB_ASSIGNED"
          : srRes.orderId
            ? "ORDER_CREATED"
            : resolvedShiprocketStatus;
      }

      // If cancelling order from Admin dropdown, automatically cancel in Shiprocket & restore inventory stock!
      if (status === "cancelled" && existing.status !== "cancelled") {
        await cancelShiprocketOrder({
          shiprocketOrderId: existing.shipping?.shiprocketOrderId,
          awbCode: existing.shipping?.trackingNumber
        });
        resolvedShiprocketStatus = "CANCELLED";
        if (!stockRestored) {
          for (const item of existing.items) {
            const prod = db.products.find((p) => p.id === item.productId);
            if (prod) {
              const sizeEntry = prod.sizes.find((s) => s.size === item.size);
              if (sizeEntry) {
                sizeEntry.stock += item.quantity || 1;
              }
            }
          }
          stockRestored = true;
        }
      }

      const updatedShipping = {
        ...existing.shipping,
        courierName: resolvedCourier,
        trackingNumber: resolvedAwb,
        trackingUrl:
          existing.shipping?.trackingUrl ||
          `https://www.apoorvashells.com/track?orderId=${existing.orderId}`,
        estimatedDelivery:
          estimatedDelivery ||
          existing.shipping?.estimatedDelivery ||
          "2-3 Business Days",
        dispatchedAt:
          status === "dispatched"
            ? new Date().toISOString()
            : existing.shipping?.dispatchedAt,
        shiprocketOrderId: resolvedShiprocketOrderId,
        shipmentId: resolvedShipmentId,
        shiprocketStatus: resolvedShiprocketStatus,
        cancelledAt:
          status === "cancelled"
            ? new Date().toISOString()
            : existing.shipping?.cancelledAt
      };

      const updatedOrder: OrderRecord = {
        ...existing,
        status: status || existing.status,
        stockRestored,
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

      let whatsappResult: { sent: boolean; messageId?: string; error?: string } | undefined;
      if (updatedOrder.customer?.phone) {
        whatsappResult = await sendWhatsAppShippingNotification({
          phone: updatedOrder.customer.phone,
          customerName: updatedOrder.customer.fullName || "Valued Guest",
          orderId: updatedOrder.orderId,
          status: updatedOrder.status,
          courierName: updatedShipping.courierName,
          trackingNumber: updatedShipping.trackingNumber,
          trackingUrl: updatedShipping.trackingUrl
        });
      }

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
          ? `Order ${orderId} updated & notifications sent via WhatsApp + Email!`
          : `Order ${orderId} updated & WhatsApp notification sent to ${updatedOrder.customer.phone || "customer"}!`,
        order: updatedOrder,
        whatsappNotification: whatsappResult,
        orders: db.orders
      });
    }

    if (action === "sync_shiprocket_order") {
      const { orderId } = body as { orderId: string };
      const idx = db.orders.findIndex((o) => o.orderId === orderId);
      if (idx === -1) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const existing = db.orders[idx];
      const srRes = await createShiprocketOrder({
        order_id: existing.orderId,
        order_date: new Date(existing.createdAt || Date.now())
          .toISOString()
          .split("T")[0],
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work",
        billing_customer_name: existing.customer.fullName || "Valued Client",
        billing_address:
          existing.customer.addressLine1 || "Coastal Delivery Address",
        billing_address_2: existing.customer.addressLine2 || "",
        billing_city: existing.customer.city || "Kochi",
        billing_pincode: existing.customer.pincode || "683101",
        billing_state: existing.customer.state || "Kerala",
        billing_country: "India",
        billing_email:
          existing.customer.email || "orders@apoorvashells.com",
        billing_phone: existing.customer.phone || "9847000000",
        shipping_is_billing: true,
        order_items: existing.items.map((i) => ({
          name: i.name,
          sku: i.productId || "APV-SET",
          units: i.quantity || 1,
          selling_price: i.unitPrice || 2499
        })),
        payment_method: "Prepaid",
        sub_total: existing.pricing?.subtotal || existing.pricing?.total || 2499,
        shipping_charges: existing.pricing?.shippingFee || 0,
        length: 22,
        breadth: 18,
        height: 12,
        weight: 0.65
      });

      existing.shipping = {
        courierName:
          srRes.courierName ||
          existing.shipping?.courierName ||
          "Blue Dart Air",
        trackingNumber:
          srRes.awbCode ||
          existing.shipping?.trackingNumber ||
          `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
        trackingUrl:
          existing.shipping?.trackingUrl ||
          `https://www.apoorvashells.com/track?orderId=${existing.orderId}`,
        estimatedDelivery:
          existing.shipping?.estimatedDelivery || "2-3 Business Days",
        dispatchedAt: existing.shipping?.dispatchedAt,
        shiprocketOrderId:
          srRes.orderId || existing.shipping?.shiprocketOrderId,
        shipmentId: srRes.shipmentId || existing.shipping?.shipmentId,
        shiprocketStatus: srRes.isSimulated
          ? "SIMULATED"
          : srRes.awbCode
            ? "AWB_ASSIGNED"
            : srRes.orderId
              ? "ORDER_CREATED"
              : existing.shipping?.shiprocketStatus
      };
      db.orders[idx] = existing;
      await persistStoreDatabase(db);

      return NextResponse.json({
        success: srRes.success,
        message: srRes.orderId
          ? `Order ${orderId} synced to Shiprocket (SR Order #${srRes.orderId}${srRes.awbCode ? ` • AWB ${srRes.awbCode}` : ""})!`
          : srRes.message || "Could not create order on Shiprocket",
        shiprocket: srRes,
        order: existing,
        orders: db.orders
      });
    }

    if (action === "cancel_and_refund_order") {
      const {
        orderId,
        cancelOrder = true,
        issueRefund = false,
        refundAmount,
        reason = "Customer requested cancellation / refund"
      } = body as {
        orderId: string;
        cancelOrder?: boolean;
        issueRefund?: boolean;
        refundAmount?: number;
        reason?: string;
      };

      const idx = db.orders.findIndex((o) => o.orderId === orderId);
      if (idx === -1) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const existing = db.orders[idx];
      const nowIso = new Date().toISOString();
      const summaryParts: string[] = [];

      // 1. Cancel in Shiprocket & restore inventory stock if cancelOrder is true
      if (cancelOrder) {
        const srCancel = await cancelShiprocketOrder({
          shiprocketOrderId: existing.shipping?.shiprocketOrderId,
          awbCode: existing.shipping?.trackingNumber
        });
        summaryParts.push(srCancel.message);

        existing.status = issueRefund ? "refunded" : "cancelled";
        if (existing.shipping) {
          existing.shipping.shiprocketStatus = "CANCELLED";
          existing.shipping.cancelledAt = nowIso;
          existing.shipping.cancellationReason = reason;
        }

        if (!existing.stockRestored) {
          for (const item of existing.items) {
            const prod = db.products.find((p) => p.id === item.productId);
            if (prod) {
              const sizeEntry = prod.sizes.find((s) => s.size === item.size);
              if (sizeEntry) {
                sizeEntry.stock += item.quantity || 1;
              }
            }
          }
          existing.stockRestored = true;
          summaryParts.push("Inventory stock restored.");
        }
      }

      // 2. Process Full or Partial Refund via Razorpay if issueRefund is true
      if (issueRefund) {
        const amountToRefund =
          typeof refundAmount === "number" && refundAmount > 0
            ? Math.min(refundAmount, existing.pricing.total)
            : existing.pricing.total;

        const rzpRefund = await refundRazorpayPayment({
          paymentId: existing.payment?.razorpayPaymentId || "",
          amountInRupees: amountToRefund,
          reason,
          orderId: existing.orderId
        });

        existing.refund = {
          status: rzpRefund.status,
          refundId: rzpRefund.refundId,
          amount: amountToRefund,
          reason,
          speed: "optimum",
          refundedAt: nowIso
        };
        if (amountToRefund >= existing.pricing.total) {
          existing.status = "refunded";
        }
        summaryParts.push(rzpRefund.message);
      }

      db.orders[idx] = existing;
      await persistStoreDatabase(db);

      // 3. Notify Customer on WhatsApp
      if (existing.customer?.phone) {
        const waText = issueRefund
          ? `🌴 *APOORVA SHELLS — Refund Processed*\n\nNamaskaram *${existing.customer.fullName}*,\nYour refund of *₹${(existing.refund?.amount || existing.pricing.total).toLocaleString("en-IN")}* for Order *#${existing.orderId}* has been initiated via Razorpay.\n\n• *Refund ID:* ${existing.refund?.refundId}\n• *Reason:* ${reason}\n• *Credit Timeline:* 2–5 business days to your original UPI / Card account.\n\nWarm regards,\nAPOORVA SHELLS Atelier (Aluva, Kerala)`
          : `🌴 *APOORVA SHELLS — Order Cancelled*\n\nNamaskaram *${existing.customer.fullName}*,\nYour Order *#${existing.orderId}* has been cancelled as requested (${reason}).\n\nWarm regards,\nAPOORVA SHELLS Atelier (Aluva, Kerala)`;

        await sendWhatsAppTextMessage({
          to: existing.customer.phone,
          body: waText
        });
      }

      return NextResponse.json({
        success: true,
        message: summaryParts.join(" "),
        order: existing,
        orders: db.orders
      });
    }

    if (action === "update_order_dispute") {
      const {
        orderId,
        disputeStatus,
        disputeType = "other",
        reason = "",
        customerNotes = "",
        adminResolutionNotes = "",
        issueRefund = false,
        refundAmount
      } = body as {
        orderId: string;
        disputeStatus: OrderDisputeInfo["status"];
        disputeType?: OrderDisputeInfo["type"];
        reason?: string;
        customerNotes?: string;
        adminResolutionNotes?: string;
        issueRefund?: boolean;
        refundAmount?: number;
      };

      const idx = db.orders.findIndex((o) => o.orderId === orderId);
      if (idx === -1) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const existing = db.orders[idx];
      const nowIso = new Date().toISOString();

      existing.dispute = {
        status: disputeStatus,
        type: disputeType,
        reason: reason || existing.dispute?.reason || "Customer Support Case",
        customerNotes: customerNotes || existing.dispute?.customerNotes,
        adminResolutionNotes:
          adminResolutionNotes || existing.dispute?.adminResolutionNotes,
        openedAt: existing.dispute?.openedAt || nowIso,
        updatedAt: nowIso,
        resolvedAt:
          disputeStatus.startsWith("resolved_") || disputeStatus === "rejected"
            ? nowIso
            : existing.dispute?.resolvedAt
      };

      if (issueRefund) {
        const amt =
          typeof refundAmount === "number" && refundAmount > 0
            ? Math.min(refundAmount, existing.pricing.total)
            : existing.pricing.total;
        const rzpRefund = await refundRazorpayPayment({
          paymentId: existing.payment?.razorpayPaymentId || "",
          amountInRupees: amt,
          reason: `Dispute Resolution: ${existing.dispute.reason}`,
          orderId: existing.orderId
        });
        existing.refund = {
          status: rzpRefund.status,
          refundId: rzpRefund.refundId,
          amount: amt,
          reason: `Dispute Resolution: ${existing.dispute.reason}`,
          speed: "optimum",
          refundedAt: nowIso
        };
        existing.status = "refunded";
      }

      db.orders[idx] = existing;
      await persistStoreDatabase(db);

      if (existing.customer?.phone && disputeStatus !== "none") {
        await sendWhatsAppTextMessage({
          to: existing.customer.phone,
          body:
            `🌴 *APOORVA SHELLS — Support & Dispute Update (#${existing.orderId})*\n\n` +
            `Namaskaram *${existing.customer.fullName}*,\n` +
            `Your support case for Order *#${existing.orderId}* is now marked *${disputeStatus.replace(/_/g, " ").toUpperCase()}*.\n` +
            (adminResolutionNotes
              ? `\n📝 *Atelier Note:* ${adminResolutionNotes}\n`
              : "") +
            (existing.refund?.refundId
              ? `\n💳 *Refund Issued:* ₹${existing.refund.amount.toLocaleString("en-IN")} (ID: ${existing.refund.refundId})\n`
              : "") +
            `\nReply here anytime if you need further assistance!`
        });
      }

      return NextResponse.json({
        success: true,
        message: `Dispute case for ${orderId} updated to ${disputeStatus.replace(/_/g, " ").toUpperCase()}!`,
        order: existing,
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
