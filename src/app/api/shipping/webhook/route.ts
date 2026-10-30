import { NextResponse } from "next/server";
import { saveTrackingRecord, generateTrackingData, fetchTrackingInfo } from "@/lib/shipping/trackingService";
import { sendShippingDispatchEmail } from "@/lib/email/emailService";
import { OrderRecord } from "@/lib/types/checkout";
import { PRODUCTS } from "@/data/products";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Shiprocket Webhook structure
    const {
      awb,
      order_id,
      current_status,
      courier_name = "Blue Dart Express",
      current_timestamp,
      location = "Destination City",
      customer_email,
      customer_name
    } = body;

    const queryKey = awb || order_id;
    if (!queryKey) {
      return NextResponse.json({ error: "Missing AWB or Order ID in webhook payload." }, { status: 400 });
    }

    console.log(`[Shiprocket Webhook] Received update for ${queryKey}: ${current_status} at ${location}`);

    // Retrieve or generate tracking record
    const existing = await fetchTrackingInfo(queryKey);
    const updatedStatus = String(current_status).toLowerCase();

    // Map Shiprocket status to our milestone stages
    let stage: "order_placed" | "handcrafted" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered" = "in_transit";
    let badgeText = current_status;

    if (updatedStatus.includes("out for delivery")) {
      stage = "out_for_delivery";
      badgeText = "Out for Doorstep Delivery Today";
    } else if (updatedStatus.includes("delivered")) {
      stage = "delivered";
      badgeText = "Delivered & Verified";
    } else if (updatedStatus.includes("pickup") || updatedStatus.includes("manifest")) {
      stage = "dispatched";
      badgeText = "Dispatched from Aluva Atelier";
    } else {
      stage = "in_transit";
      badgeText = "In Transit — Air Cargo Express";
    }

    existing.currentStatus = stage;
    existing.statusBadge = badgeText;
    existing.lastScanTimestamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Update milestone flags
    let stageMatched = false;
    for (let i = 0; i < existing.milestones.length; i++) {
      const m = existing.milestones[i];
      if (m.stage === stage) {
        m.isCompleted = true;
        m.isCurrent = true;
        m.location = location;
        m.timestamp = `Today, ${existing.lastScanTimestamp}`;
        stageMatched = true;
      } else if (!stageMatched) {
        m.isCompleted = true;
        m.isCurrent = false;
      } else {
        m.isCompleted = false;
        m.isCurrent = false;
      }
    }

    saveTrackingRecord(existing);

    // If customer email is known and package is out for delivery, send instant notification
    if (stage === "out_for_delivery" && customer_email) {
      const dummyOrder: OrderRecord = {
        orderId: existing.orderId,
        receiptNumber: "RCP-WH-01",
        createdAt: new Date().toISOString(),
        status: "dispatched",
        customer: {
          fullName: customer_name || existing.destination.recipientName,
          email: customer_email,
          phone: "+91 98000 00000",
          addressLine1: "Customer Address",
          city: existing.destination.city,
          state: existing.destination.state,
          pincode: existing.destination.pincode,
          country: "India"
        },
        items: [
          {
            id: "apv-01",
            productId: PRODUCTS[0].id,
            name: PRODUCTS[0].name,
            size: "M/L",
            quantity: 1,
            unitPrice: PRODUCTS[0].price,
            totalPrice: PRODUCTS[0].price,
            image: PRODUCTS[0].image
          }
        ],
        pricing: {
          rawSubtotal: PRODUCTS[0].price,
          discountPercentage: 0,
          discountAmount: 0,
          subtotal: PRODUCTS[0].price,
          shippingFee: 0,
          total: PRODUCTS[0].price,
          currency: "INR"
        },
        payment: {
          gateway: "razorpay",
          razorpayOrderId: "order_wh",
          isSandbox: true
        },
        shipping: {
          courierName: courier_name,
          trackingNumber: existing.trackingNumber,
          trackingUrl: existing.trackingUrl,
          estimatedDelivery: "Today by 2:00 PM"
        }
      };

      await sendShippingDispatchEmail({
        order: dummyOrder,
        trackingNumber: existing.trackingNumber,
        courierName: courier_name
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed and tracking updated.",
      awb,
      stage,
      badgeText
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error processing webhook";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
