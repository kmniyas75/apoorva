import { NextResponse } from "next/server";
import {
  getStoreDatabase,
  ensureStoreDatabaseLoaded,
  persistStoreDatabase,
  recordOrderInStore,
  SocialAutomationEvent
} from "@/lib/store/adminStore";
import { OrderRecord } from "@/lib/types/checkout";
import {
  getMetaWhatsAppConfig,
  sendWhatsAppTextMessage
} from "@/lib/meta/whatsapp";
import { generateGeminiReply } from "@/lib/ai/gemini";

/**
 * Meta Cloud API (WhatsApp Business & Instagram Graph API) Webhook Verification
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const db = await ensureStoreDatabaseLoaded();
  const expectedToken =
    db.socialAutomation?.webhookVerifyToken || "apoorva_meta_verify_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge || "VERIFIED", { status: 200 });
  }

  const metaWa = getMetaWhatsAppConfig();

  return NextResponse.json({
    status: "active",
    webhook: "APOORVA WhatsApp & Instagram DM Order Automation Endpoint",
    metaAppId: process.env.META_APP_ID || "1063008853460924",
    metaBusinessId: process.env.META_BUSINESS_ID || "1678860643969539",
    whatsappPhoneNumberId: metaWa.phoneNumberId,
    whatsappWabaId: metaWa.wabaId,
    whatsappTestNumber: metaWa.testNumber,
    whatsappAccessTokenConfigured: Boolean(metaWa.accessToken),
    contactEmail: process.env.META_CONTACT_EMAIL || "apoorvacoastal@gmail.com",
    verifyTokenConfigured: Boolean(expectedToken),
    whatsappEnabled: db.socialAutomation?.whatsappEnabled ?? true,
    instagramEnabled: db.socialAutomation?.instagramEnabled ?? true
  });
}

/**
 * Automated Order Completion & Gemini AI Concierge from WhatsApp Business API / Instagram DM Webhook
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await ensureStoreDatabaseLoaded();

    // Parse native Meta Cloud API / Instagram Graph API webhook payload if present
    let isNativeMetaWebhook = false;
    let metaChannel: "whatsapp" | "instagram" | undefined;
    let metaSenderName: string | undefined;
    let metaSenderHandle: string | undefined;
    let metaMessageText: string | undefined;

    if (body?.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      isNativeMetaWebhook = true;
      metaChannel = "whatsapp";
      const val = body.entry?.[0]?.changes?.[0]?.value;
      const msgObj = val?.messages?.[0];
      const contactObj = val?.contacts?.[0];
      if (!msgObj) {
        return NextResponse.json({ status: "ignored_status_event" });
      }
      metaSenderName = contactObj?.profile?.name || "WhatsApp Client";
      metaSenderHandle = msgObj?.from || "+91 98470 55112";
      metaMessageText =
        msgObj?.text?.body ||
        msgObj?.interactive?.button_reply?.title ||
        "BUY SET 1";
    } else if (body?.object === "instagram" && Array.isArray(body.entry)) {
      isNativeMetaWebhook = true;
      metaChannel = "instagram";
      const messaging = body.entry?.[0]?.messaging?.[0];
      if (!messaging?.message?.text) {
        return NextResponse.json({ status: "ignored_status_event" });
      }
      metaSenderName = "Instagram Client";
      metaSenderHandle = `@ig_${messaging?.sender?.id || "guest"}`;
      metaMessageText = messaging.message.text;
    }

    const {
      channel = metaChannel || "whatsapp",
      senderName = metaSenderName || "Coastal Guest",
      senderHandleOrPhone = metaSenderHandle || "+91 98470 55112",
      message = metaMessageText || "BUY SET 1 | Coastal Guest | Beach Road Villa, Goa 403515 | UPI",
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

    const upperMsg = message.toUpperCase();
    const isOrderIntent =
      !isNativeMetaWebhook ||
      upperMsg.includes("BUY") ||
      upperMsg.includes("ORDER") ||
      upperMsg.includes("BOOK") ||
      upperMsg.includes("SET 1") ||
      upperMsg.includes("SET 2") ||
      upperMsg.includes("SET1") ||
      upperMsg.includes("SET2") ||
      upperMsg.includes("BOTH");

    // If a real WhatsApp/IG user sends a general question (e.g., "Hi", "What is the price?", "Cup size help"),
    // answer with Gemini AI and send via Meta WhatsApp Cloud API!
    if (isNativeMetaWebhook && !isOrderIntent) {
      const aiResult = await generateGeminiReply({
        prompt: message,
        systemInstruction: `You are APOORVA™'s WhatsApp & Instagram AI Coastal Stylist (Aluva, Kerala). Reply warmly in 2-3 short sentences. Mention Set 01 (Coconut & Coir Fringe Beach Set, ₹4,200) and Set 02 (Coconut & Jute Wrap Beach Set, ₹4,500), 15% Bundle Discount for both, and tell them they can reply "BUY SET 1", "BUY SET 2", or "BUY BOTH" to place an instant order.`
      });

      let whatsappDelivery = null;
      if (channel === "whatsapp") {
        whatsappDelivery = await sendWhatsAppTextMessage({
          to: senderHandleOrPhone,
          body: aiResult.text
        });
      }

      const inquiryEvent: SocialAutomationEvent = {
        id: `soc-${Date.now()}`,
        channel,
        senderHandleOrPhone,
        senderName,
        incomingMessage: message,
        automatedReply: aiResult.text,
        detectedIntent: "catalog_sent",
        timestamp: new Date().toISOString()
      };

      const updatedDb = getStoreDatabase();
      updatedDb.socialEvents = [inquiryEvent, ...(updatedDb.socialEvents || [])];
      await persistStoreDatabase(updatedDb);

      return NextResponse.json({
        success: true,
        intent: "catalog_sent",
        aiReply: aiResult.text,
        whatsappCloudApi: whatsappDelivery,
        event: inquiryEvent
      });
    }

    const prod1 = db.products[0];
    const prod2 = db.products[1] || db.products[0];

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

    const siteUrl = process.env.SITE_URL || "https://apoorva-eight.vercel.app";

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
        orderNotes: `Auto-completed via ${
          channel === "whatsapp" ? "WhatsApp Business Bot" : "Instagram DM Automation"
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
        trackingUrl: `${siteUrl}/track?orderId=${orderId}`,
        estimatedDelivery: "2-3 Business Days"
      }
    };

    recordOrderInStore(newOrder);

    const automatedReply =
      channel === "whatsapp"
        ? `✅ Namaskaram ${senderName}! Your APOORVA™ WhatsApp Order #${orderId} (${selectedProducts
            .map((p) => p.shortName)
            .join(" + ")}) for ₹${total.toLocaleString(
            "en-IN"
          )} (${paymentMethod.toUpperCase()}) is confirmed! Blue Dart AWB #${awb} assigned. Track live: ${siteUrl}/track?orderId=${orderId}`
        : `✅ Hey ${senderName}! Your APOORVA™ Instagram DM Order #${orderId} (${selectedProducts
            .map((p) => p.shortName)
            .join(" + ")}) for ₹${total.toLocaleString(
            "en-IN"
          )} (${paymentMethod.toUpperCase()}) is booked! Track live with AWB #${awb}: ${siteUrl}/track?orderId=${orderId}`;

    // Send real WhatsApp confirmation message via Meta Cloud API (v25.0/1388810254321373/messages)
    let whatsappDelivery = null;
    if (channel === "whatsapp") {
      whatsappDelivery = await sendWhatsAppTextMessage({
        to: senderHandleOrPhone,
        body: automatedReply,
        previewUrl: true
      });
    }

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
    await persistStoreDatabase(updatedDb);

    return NextResponse.json({
      success: true,
      message: `Automated ${channel.toUpperCase()} order #${orderId} created!`,
      order: newOrder,
      event: socialEvent,
      whatsappCloudApi: whatsappDelivery,
      orders: updatedDb.orders,
      socialEvents: updatedDb.socialEvents
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Social webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
