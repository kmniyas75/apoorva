import { NextResponse } from "next/server";
import {
  getStoreDatabase,
  ensureStoreDatabaseLoaded
} from "@/lib/store/adminStore";
import { getMetaWhatsAppConfig } from "@/lib/meta/whatsapp";
import {
  processIncomingSalesChat,
  handleAdminChatAction
} from "@/lib/ai/salesAgent";

/**
 * Meta Cloud API (WhatsApp Business, Instagram DM & Facebook Messenger) Webhook Verification
 * + Live Chat Sessions endpoint when called from Admin Panel without hub.challenge
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
    webhook:
      "APOORVA Omnichannel AI Sales Agent Webhook (WhatsApp, Instagram, Facebook & Website)",
    metaAppId: process.env.META_APP_ID || "1063008853460924",
    metaBusinessId: process.env.META_BUSINESS_ID || "1678860643969539",
    whatsappPhoneNumberId: metaWa.phoneNumberId,
    whatsappWabaId: metaWa.wabaId,
    whatsappTestNumber: metaWa.testNumber,
    whatsappAccessTokenConfigured: Boolean(metaWa.accessToken),
    contactEmail: process.env.META_CONTACT_EMAIL || "apoorvacoastal@gmail.com",
    verifyTokenConfigured: Boolean(expectedToken),
    whatsappEnabled: db.socialAutomation?.whatsappEnabled ?? true,
    instagramEnabled: db.socialAutomation?.instagramEnabled ?? true,
    chatSessions: db.chatSessions || [],
    socialEvents: db.socialEvents || [],
    orders: db.orders || []
  });
}

/**
 * Handles:
 * 1. Native Meta Webhooks (WhatsApp Cloud API, Meta Dashboard Test Webhook, Instagram DM, Facebook Page Messenger)
 * 2. Admin Live Chat Actions (`admin_reply`, `send_payment_link`, `toggle_autopilot`)
 * 3. Simulated or Direct Customer Sales Chat messages (`incoming_chat` or standard webhook simulator)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await ensureStoreDatabaseLoaded();

    // 1. Check if this is an Admin Chat Action from the Admin Inbox
    if (
      body?.action === "admin_reply" ||
      body?.action === "send_payment_link" ||
      body?.action === "toggle_autopilot"
    ) {
      const result = await handleAdminChatAction({
        sessionId: body.sessionId,
        action: body.action,
        messageText: body.messageText,
        aiAutoPilot: body.aiAutoPilot,
        selectedProduct: body.selectedProduct
      });
      const updatedDb = getStoreDatabase();
      return NextResponse.json({
        success: true,
        session: result.session,
        order: result.order,
        outboundDelivery: result.outboundDelivery,
        chatSessions: updatedDb.chatSessions || [],
        orders: updatedDb.orders || [],
        socialEvents: updatedDb.socialEvents || []
      });
    }

    // 2. Parse Native Meta Cloud API Webhooks (WhatsApp, Meta Dashboard Test, Instagram, Facebook Page)
    let metaChannel: "whatsapp" | "instagram" | "facebook" | undefined;
    let metaSenderName: string | undefined;
    let metaSenderHandle: string | undefined;
    let metaMessageText: string | undefined;

    if (
      body?.object === "whatsapp_business_account" &&
      Array.isArray(body.entry)
    ) {
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
        msgObj?.button?.text ||
        "Hi! Tell me about APOORVA beachwear sets.";
    } else if (
      body?.field === "messages" &&
      body?.value?.messaging_product === "whatsapp"
    ) {
      // Meta Dashboard "Send to server v26.0" test webhook format
      metaChannel = "whatsapp";
      const val = body.value;
      const msgObj = val?.messages?.[0];
      const contactObj = val?.contacts?.[0];
      metaSenderName = contactObj?.profile?.name || "Meta Test Customer";
      metaSenderHandle =
        msgObj?.from || contactObj?.wa_id || "+1 (631) 555-1181";
      metaMessageText =
        msgObj?.text?.body ||
        "Hi! I want to check out the APOORVA Coconut Beachwear sets.";
    } else if (body?.object === "instagram" && Array.isArray(body.entry)) {
      metaChannel = "instagram";
      const messaging = body.entry?.[0]?.messaging?.[0];
      const changeVal = body.entry?.[0]?.changes?.[0]?.value;
      const text =
        messaging?.message?.text || changeVal?.message?.text || changeVal?.text;
      if (!text) {
        return NextResponse.json({ status: "ignored_status_event" });
      }
      const senderId =
        messaging?.sender?.id || changeVal?.from?.id || "guest";
      metaSenderName =
        changeVal?.from?.username || `Instagram Guest (${String(senderId).slice(-4)})`;
      metaSenderHandle = String(senderId).startsWith("@")
        ? String(senderId)
        : `@ig_${senderId}`;
      metaMessageText = text;
    } else if (body?.object === "page" && Array.isArray(body.entry)) {
      metaChannel = "facebook";
      const messaging = body.entry?.[0]?.messaging?.[0];
      if (!messaging?.message?.text) {
        return NextResponse.json({ status: "ignored_status_event" });
      }
      const senderId = messaging?.sender?.id || "fb_guest";
      metaSenderName = `Facebook Guest (${String(senderId).slice(-4)})`;
      metaSenderHandle = `fb.me/${senderId}`;
      metaMessageText = messaging.message.text;
    }

    const channel: "whatsapp" | "instagram" | "facebook" | "website" =
      metaChannel || body?.channel || "whatsapp";
    const senderName: string =
      metaSenderName || body?.senderName || "Coastal Guest";
    const senderHandleOrPhone: string =
      metaSenderHandle || body?.senderHandleOrPhone || "+91 98470 55112";

    // Build message text (supporting both multi-turn chat simulator and 1-shot order simulator)
    let messageText: string =
      metaMessageText ||
      body?.message ||
      "Hi! Which beachwear set do you recommend?";

    if (
      !metaChannel &&
      body?.addressLine1 &&
      body?.pincode &&
      !messageText.includes(body.pincode)
    ) {
      const prodLabel =
        body.productSelection === "both"
          ? "BOTH SETS"
          : body.productSelection === "set2"
            ? "SET 2"
            : "SET 1";
      messageText = `${prodLabel} | ${senderName} | ${body.addressLine1}, ${body.city || "Goa"} - PIN ${body.pincode}`;
    }

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

    const salesResult = await processIncomingSalesChat({
      channel,
      customerHandleOrPhone: senderHandleOrPhone,
      customerName: senderName,
      messageText,
      sessionId: body?.sessionId
    });

    const updatedDb = getStoreDatabase();
    const latestEvent = updatedDb.socialEvents?.[0];

    return NextResponse.json({
      success: true,
      message: salesResult.order
        ? `Order #${salesResult.order.orderId} created & 1-Click Razorpay Payment Link sent!`
        : `AI Sales Agent replied on ${channel.toUpperCase()}`,
      session: salesResult.session,
      aiReply: salesResult.aiReply,
      paymentLink: salesResult.paymentLink,
      order: salesResult.order,
      event: latestEvent,
      whatsappCloudApi: salesResult.outboundDelivery,
      chatSessions: updatedDb.chatSessions || [],
      orders: updatedDb.orders || [],
      socialEvents: updatedDb.socialEvents || []
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Social webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
