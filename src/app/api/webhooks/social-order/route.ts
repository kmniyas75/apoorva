import { NextResponse } from "next/server";
import {
  getStoreDatabase,
  saveStoreDatabase,
  recordOrderInStore,
  SocialAutomationEvent
} from "@/lib/store/adminStore";
import { OrderRecord } from "@/lib/types/checkout";

/**
 * Meta Cloud API (WhatsApp Business & Instagram Graph API) Webhook Verification
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const db = getStoreDatabase();
  const expectedToken =
    db.socialAutomation?.webhookVerifyToken || "apoorva_meta_verify_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge || "VERIFIED", { status: 200 });
  }

  return NextResponse.json({
    status: "active",
    webhook: "APOORVA WhatsApp & Instagram DM Order Automation Endpoint",
    verifyTokenConfigured: Boolean(expectedToken),
    whatsappEnabled: db.socialAutomation?.whatsappEnabled ?? true,
    instagramEnabled: db.socialAutomation?.instagramEnabled ?? true
  });
}

/**
 * Automated Order Completion from WhatsApp Business API / Instagram DM Webhook
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getStoreDatabase();

    const {
      channel = "whatsapp",
      senderName = "Coastal Guest",
      senderHandleOrPhone = "+91 98470 55112",
      message = "BUY SET 1 | Coastal Guest | Beach Road Villa, Goa 403515 | UPI",
      productSelection = "set1", // "set1" | "set2" | "both"
      size = "FREE SIZE (Adjustable Tie)",
      paymentMethod = "upi", // "upi" | "cod"
      addressLine1 = "Candolim Beach Resort Villa",
      city = "North Goa",
      state = "Goa",
      pincode = "403515"
    } = body as {
      channel?: "whatsapp" | "instagram";
      senderName?: string;
      senderHandleOrPhone?: string;
      message?: string;
      productSelection?: "set1" | "set2" | "both";
      size?: string;
      paymentMethod?: "upi" | "cod";
      addressLine1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };

    if (channel === "whatsapp" && !db.socialAutomation.whatsappEnabled) {
      return NextResponse.json(
        { error: "WhatsApp automation is currently paused in Admin Settings." },
        { status: 400 }
      );
    }

    if (channel === "instagram" && !db.socialAutomation.instagramEnabled) {
      return NextResponse.json(
        { error: "Instagram DM automation is currently paused in Admin Settings." },
        { status: 400 }
      );
    }

    const prod1 = db.products[0];
    const prod2 = db.products[1] || db.products[0];

    // Infer product choice from message or explicit selection
    const upperMsg = message.toUpperCase();
    const isBoth =
      productSelection === "both" ||
      upperMsg.includes("BOTH") ||
      upperMsg.includes("BUNDLE");
    const isSet2 =
      !isBoth &&
      (productSelection === "set2" ||
        upperMsg.includes("SET 2") ||
        upperMsg.includes("SET2") ||
        upperMsg.includes("JUTE"));

    const selectedProducts = isBoth ? [prod1, prod2] : isSet2 ? [prod2] : [prod1];
    const discountPct = isBoth ? db.settings.bundleDiscountPercent || 15 : 0;

    const rawSubtotal = selectedProducts.reduce((s, p) => s + p.price, 0);
    const discountAmount = Math.round((rawSubtotal * discountPct) / 100);
    const total = Math.max(0, rawSubtotal - discountAmount);

    const orderId = `APV-${Math.floor(10000 + Math.random() * 90000)}`;
    const awb = `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`;
    const nowIso = new Date().toISOString();

    const cleanPhone =
      senderHandleOrPhone.replace(/\D/g, "").slice(-10) || "9847089421";

    const newOrder: OrderRecord = {
      orderId,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      createdAt: nowIso,
      status: "paid",
      source: channel,
      socialHandle: senderHandleOrPhone,
      customer: {
        fullName: senderName,
        phone: cleanPhone,
        email: `${cleanPhone}@${channel}.apoorva.store`,
        addressLine1,
        city,
        state,
        pincode,
        country: "India",
        orderNotes: `Auto-completed via ${channel === "whatsapp" ? "WhatsApp Business Bot" : "Instagram DM Automation"
          }: "${message}"`
      },
      items: selectedProducts.map((p) => ({
        id: `${p.id}-${size}`,
        productId: p.id,
        name: p.name,
        subName: p.subName,
        size,
        quantity: 1,
        unitPrice: p.price,
        totalPrice: p.price,
        image: p.image,
        color: p.color
      })),
      pricing: {
        rawSubtotal,
        discountPercentage: discountPct,
        discountAmount,
        subtotal: total,
        shippingFee: 0,
        total,
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: `${channel.toUpperCase()}-${orderId}`,
        razorpayPaymentId: `pay_rzp_${Date.now().toString().slice(-6)}`,
        method: "razorpay",
        isSandbox: true,
        paidAt: nowIso
      },
      shipping: {
        courierName: "Blue Dart Express (Air Cargo)",
        trackingNumber: awb,
        trackingUrl: `http://localhost:3000/track?orderId=${orderId}`,
        estimatedDelivery: "2-3 Business Days"
      }
    };

    recordOrderInStore(newOrder);

    const automatedReply =
      channel === "whatsapp"
        ? `✅ Namaskaram ${senderName}! Your WhatsApp Order #${orderId} (${selectedProducts
          .map((p) => p.shortName)
          .join(" + ")}) for ₹${total.toLocaleString(
            "en-IN"
          )} (${paymentMethod.toUpperCase()}) is confirmed! Blue Dart AWB #${awb} assigned.`
        : `✅ Hey ${senderName}! Your Instagram DM Order #${orderId} (${selectedProducts
          .map((p) => p.shortName)
          .join(" + ")}) for ₹${total.toLocaleString(
            "en-IN"
          )} (${paymentMethod.toUpperCase()}) is booked! Track live with AWB #${awb}.`;

    const socialEvent: SocialAutomationEvent = {
      id: `soc-${Date.now()}`,
      channel,
      senderHandleOrPhone,
      senderName,
      incomingMessage: message,
      automatedReply,
      detectedIntent: "order_created",
      orderId,
      amount: total,
      timestamp: nowIso
    };

    const updatedDb = getStoreDatabase();
    updatedDb.socialEvents = [socialEvent, ...(updatedDb.socialEvents || [])];
    saveStoreDatabase(updatedDb);

    return NextResponse.json({
      success: true,
      message: `Automated ${channel.toUpperCase()} order #${orderId} created!`,
      order: newOrder,
      event: socialEvent,
      orders: updatedDb.orders,
      socialEvents: updatedDb.socialEvents
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Social webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

