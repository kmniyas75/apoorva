import { NextResponse } from "next/server";
import {
  ensureStoreDatabaseLoaded,
  persistStoreDatabase
} from "@/lib/store/adminStore";
import { OrderRecord } from "@/lib/types/checkout";
import { sendWhatsAppShippingNotification } from "@/lib/meta/whatsapp";
import {
  generateTrackingData,
  saveTrackingRecord
} from "@/lib/shipping/trackingService";

function mapShiprocketStatus(rawStatus: string): OrderRecord["status"] | null {
  const s = (rawStatus || "").toUpperCase();
  if (s.includes("DELIVERED")) return "delivered";
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (
    s.includes("SHIPPED") ||
    s.includes("IN TRANSIT") ||
    s.includes("PICKED UP") ||
    s.includes("DISPATCHED")
  ) {
    return "dispatched";
  }
  if (s.includes("CANCEL")) return "cancelled";
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const orderId = String(
      body.order_id || body.channel_order_id || ""
    ).trim();
    const awb = String(body.awb || body.awb_code || "").trim();
    const courierName = String(
      body.courier_name || body.carrier_name || "Shiprocket Express"
    ).trim();
    const currentStatus = String(
      body.current_status || body.shipment_status || ""
    ).trim();
    const etd = String(body.etd || "").trim();

    if (!orderId && !awb) {
      return NextResponse.json({ received: true });
    }

    const db = await ensureStoreDatabaseLoaded();
    const idx = db.orders.findIndex(
      (o) =>
        o.orderId.toUpperCase() === orderId.toUpperCase() ||
        (awb && o.shipping?.trackingNumber === awb)
    );

    if (idx === -1) {
      return NextResponse.json({ received: true, matched: false });
    }

    const existing = db.orders[idx];
    const mappedStatus = mapShiprocketStatus(currentStatus) || existing.status;

    const updatedOrder: OrderRecord = {
      ...existing,
      status: mappedStatus,
      shipping: {
        courierName:
          courierName || existing.shipping?.courierName || "Shiprocket Express",
        trackingNumber: awb || existing.shipping?.trackingNumber || "Assigned",
        trackingUrl: `https://www.apoorvashells.com/track?orderId=${existing.orderId}`,
        estimatedDelivery:
          etd || existing.shipping?.estimatedDelivery || "2-3 Business Days",
        dispatchedAt:
          mappedStatus === "dispatched" && !existing.shipping?.dispatchedAt
            ? new Date().toISOString()
            : existing.shipping?.dispatchedAt
      }
    };

    db.orders[idx] = updatedOrder;
    await persistStoreDatabase(db);

    const trackRec = generateTrackingData(
      updatedOrder.orderId,
      updatedOrder.customer.city,
      updatedOrder.customer.state,
      updatedOrder.customer.pincode,
      updatedOrder.customer.fullName
    );
    trackRec.courierName = updatedOrder.shipping!.courierName;
    trackRec.trackingNumber = updatedOrder.shipping!.trackingNumber;
    saveTrackingRecord(trackRec);

    if (updatedOrder.customer?.phone && mappedStatus !== existing.status) {
      await sendWhatsAppShippingNotification({
        phone: updatedOrder.customer.phone,
        customerName: updatedOrder.customer.fullName || "Valued Guest",
        orderId: updatedOrder.orderId,
        status: updatedOrder.status,
        courierName: updatedOrder.shipping!.courierName,
        trackingNumber: updatedOrder.shipping!.trackingNumber,
        trackingUrl: updatedOrder.shipping!.trackingUrl
      });
    }

    return NextResponse.json({
      received: true,
      matched: true,
      orderId: updatedOrder.orderId,
      status: updatedOrder.status
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        received: true,
        error: err instanceof Error ? err.message : "Webhook error"
      },
      { status: 200 }
    );
  }
}

