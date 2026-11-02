import {
  ChatMessage,
  ChatSession,
  SocialAutomationEvent,
  StoreDatabase,
  ensureStoreDatabaseLoaded,
  persistStoreDatabase,
  recordOrderInStore
} from "@/lib/store/adminStore";
import { OrderRecord } from "@/lib/types/checkout";
import { generateGeminiReply, GeminiMessage } from "@/lib/ai/gemini";
import {
  sendWhatsAppTextMessage,
  sendMetaSocialDirectMessage
} from "@/lib/meta/whatsapp";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://apoorva-eight.vercel.app")
    .trim()
    .replace(/\/+$/, "");

function detectProductChoice(
  text: string
): "set1" | "set2" | "both" | undefined {
  const upper = text.toUpperCase();
  if (
    upper.includes("BOTH") ||
    upper.includes("BUNDLE") ||
    upper.includes("ALL") ||
    upper.includes("2 SETS") ||
    upper.includes("TWO SETS") ||
    (upper.includes("SET 1") && upper.includes("SET 2"))
  ) {
    return "both";
  }
  if (
    upper.includes("SET 2") ||
    upper.includes("SET2") ||
    upper.includes("SET 02") ||
    upper.includes("JUTE") ||
    upper.includes("WRAP") ||
    upper.includes("4500") ||
    upper.includes("4,500")
  ) {
    return "set2";
  }
  if (
    upper.includes("SET 1") ||
    upper.includes("SET1") ||
    upper.includes("SET 01") ||
    upper.includes("COIR") ||
    upper.includes("FRINGE") ||
    upper.includes("HULA") ||
    upper.includes("4200") ||
    upper.includes("4,200")
  ) {
    return "set1";
  }
  return undefined;
}

function detectSizeChoice(text: string): string | undefined {
  const upper = text.toUpperCase();
  if (upper.includes("S/M") || upper.includes("STYLE A")) {
    return "S/M (Style A Cup)";
  }
  if (upper.includes("M/L") || upper.includes("STYLE B")) {
    return "M/L (Style B Cup)";
  }
  if (upper.includes("FREE SIZE")) {
    return "FREE SIZE (Adjustable Tie)";
  }
  return undefined;
}

function detectAddressFromText(
  text: string,
  stage: ChatSession["stage"]
): {
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
} | null {
  const pinMatch = text.match(/\b([1-8]\d{5})\b/);
  const hasAddressKeywords =
    /\b(pin|pincode|road|rd|street|st|villa|flat|apt|apartment|house|lane|nagar|sector|colony|hills|drive|beach|kochi|kerala|goa|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune|kolkata)\b/i.test(
      text
    );

  if (!pinMatch && !(stage === "collecting_address" && hasAddressKeywords && text.trim().length > 18)) {
    return null;
  }

  const pincode = pinMatch ? pinMatch[1] : "683101";
  let state = "Maharashtra";
  let city = "Mumbai";

  if (pincode.startsWith("68") || pincode.startsWith("69") || pincode.startsWith("67") || /kerala|kochi|aluva|varkala|kovalam|trivandrum|calicut/i.test(text)) {
    state = "Kerala";
    city = /varkala/i.test(text)
      ? "Varkala"
      : /aluva/i.test(text)
        ? "Aluva"
        : "Kochi";
  } else if (pincode.startsWith("403") || /goa|candolim|calangute|anjuna|panjim|baga/i.test(text)) {
    state = "Goa";
    city = "North Goa";
  } else if (pincode.startsWith("56") || /bangalore|bengaluru/i.test(text)) {
    state = "Karnataka";
    city = "Bengaluru";
  } else if (pincode.startsWith("11") || /delhi|gurgaon|noida/i.test(text)) {
    state = "Delhi NCR";
    city = "New Delhi";
  } else if (pincode.startsWith("60") || /chennai/i.test(text)) {
    state = "Tamil Nadu";
    city = "Chennai";
  } else if (pincode.startsWith("50") || /hyderabad/i.test(text)) {
    state = "Telangana";
    city = "Hyderabad";
  }

  const cleanAddress = text
    .replace(/^(buy|order|book|set\s*1|set\s*2|both\s*sets?)\s*[|\-,:]?\s*/i, "")
    .trim();

  return {
    addressLine1: cleanAddress.slice(0, 140),
    city,
    state,
    pincode
  };
}

export function createOrderForChatSession(
  db: StoreDatabase,
  session: ChatSession
): OrderRecord {
  const prod1 = db.products[0];
  const prod2 = db.products[1] || db.products[0];
  const choice = session.selectedProduct || "set1";
  const chosenSize = session.selectedSize || "FREE SIZE (Adjustable Tie)";

  const selectedItems: OrderRecord["items"] = [];
  if (choice === "set1" || choice === "both") {
    selectedItems.push({
      id: `${prod1.id}-${chosenSize}`,
      productId: prod1.id,
      name: prod1.name,
      subName: prod1.subName,
      size: chosenSize,
      quantity: 1,
      unitPrice: prod1.price,
      totalPrice: prod1.price,
      image: prod1.image,
      color: prod1.color
    });
  }
  if (choice === "set2" || choice === "both") {
    selectedItems.push({
      id: `${prod2.id}-${chosenSize}`,
      productId: prod2.id,
      name: prod2.name,
      subName: prod2.subName,
      size: chosenSize,
      quantity: 1,
      unitPrice: prod2.price,
      totalPrice: prod2.price,
      image: prod2.image,
      color: prod2.color
    });
  }

  const rawSubtotal = selectedItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalQty = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const discountPct = totalQty >= 2 ? db.settings.bundleDiscountPercent : 0;
  const discountAmount = Math.round((rawSubtotal * discountPct) / 100);
  const total = rawSubtotal - discountAmount;

  const orderNum = Math.floor(10000 + Math.random() * 90000);
  const orderId = session.orderId || `APV-${orderNum}`;
  const nowIso = new Date().toISOString();
  const addr = session.collectedAddress || {
    addressLine1: "Coastal Resort Delivery",
    city: "Kochi",
    state: "Kerala",
    pincode: "683101"
  };

  const phoneDigits = session.customerHandleOrPhone.replace(/\D/g, "");
  const cleanPhone =
    phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "9847089421";

  const newOrder: OrderRecord = {
    orderId,
    receiptNumber: `RCP-${orderNum}`,
    createdAt: nowIso,
    status: "processing",
    source:
      session.channel === "facebook"
        ? "instagram"
        : session.channel === "website"
          ? "website"
          : session.channel,
    socialHandle: session.customerHandleOrPhone,
    customer: {
      fullName: session.customerName || "Valued Coastal Guest",
      email: `${session.customerHandleOrPhone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "guest"}@social.apoorva.in`,
      phone: cleanPhone,
      addressLine1: addr.addressLine1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: "India",
      orderNotes: `AI Sales Agent Order via ${session.channel.toUpperCase()}`
    },
    items: selectedItems,
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
      razorpayOrderId: `order_chat_${orderNum}`,
      razorpayPaymentId: `pending_${orderNum}`,
      method: "upi",
      isSandbox: true,
      paidAt: nowIso
    },
    shipping: {
      courierName: "Blue Dart Express (Air Cargo)",
      trackingNumber: `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
      trackingUrl: `${SITE_URL}/track?orderId=${orderId}`,
      estimatedDelivery: "2-3 Business Days"
    }
  };

  recordOrderInStore(newOrder);
  return newOrder;
}

async function dispatchOutboundSocialMessage(
  channel: ChatSession["channel"],
  recipientHandleOrPhone: string,
  text: string
): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  if (channel === "whatsapp") {
    return sendWhatsAppTextMessage({
      to: recipientHandleOrPhone,
      body: text,
      previewUrl: true
    });
  }
  if (channel === "instagram" || channel === "facebook") {
    return sendMetaSocialDirectMessage({
      channel,
      recipientId: recipientHandleOrPhone,
      body: text
    });
  }
  return { sent: true, messageId: `web-${Date.now()}` };
}

/**
 * Processes an incoming customer message on WhatsApp, Instagram, Facebook, or Website,
 * updates the multi-turn ChatSession, runs the Gemini AI Sales Agent (if Auto-Pilot is on),
 * collects address + creates the order + sends the 1-Click Razorpay payment link.
 */
export async function processIncomingSalesChat(params: {
  channel: "whatsapp" | "instagram" | "facebook" | "website";
  customerHandleOrPhone: string;
  customerName?: string;
  messageText: string;
  sessionId?: string;
}): Promise<{
  session: ChatSession;
  aiReply?: string;
  paymentLink?: string;
  order?: OrderRecord;
  outboundDelivery?: { sent: boolean; messageId?: string; error?: string };
}> {
  const db = await ensureStoreDatabaseLoaded();
  if (!Array.isArray(db.chatSessions)) {
    db.chatSessions = [];
  }

  const normalizedHandle = params.customerHandleOrPhone.trim();
  let session = db.chatSessions.find(
    (s) =>
      (params.sessionId && s.id === params.sessionId) ||
      (s.channel === params.channel &&
        s.customerHandleOrPhone.toLowerCase() === normalizedHandle.toLowerCase())
  );

  const nowIso = new Date().toISOString();

  if (!session) {
    session = {
      id:
        params.sessionId ||
        `chat-${params.channel}-${normalizedHandle.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || Date.now()}`,
      channel: params.channel,
      customerHandleOrPhone: normalizedHandle,
      customerName:
        params.customerName?.trim() ||
        (params.channel === "whatsapp"
          ? `WhatsApp Guest (${normalizedHandle.slice(-4)})`
          : normalizedHandle),
      stage: "pitching",
      aiAutoPilot: true,
      messages: [],
      updatedAt: nowIso
    };
    db.chatSessions.unshift(session);
  } else {
    if (
      params.customerName &&
      params.customerName.trim() &&
      (session.customerName.includes("Guest") ||
        session.customerName === session.customerHandleOrPhone)
    ) {
      session.customerName = params.customerName.trim();
    }
    // Move active session to top of inbox
    db.chatSessions = [
      session,
      ...db.chatSessions.filter((s) => s.id !== session!.id)
    ];
  }

  // 1. Append incoming customer message
  const customerMsg: ChatMessage = {
    id: `msg-cust-${Date.now()}`,
    sender: "customer",
    text: params.messageText.trim(),
    timestamp: nowIso
  };
  session.messages.push(customerMsg);
  session.updatedAt = nowIso;

  // 2. Detect product, size, and address from the customer's message
  const detectedProduct = detectProductChoice(params.messageText);
  if (detectedProduct) {
    session.selectedProduct = detectedProduct;
  }

  const detectedSize = detectSizeChoice(params.messageText);
  if (detectedSize) {
    session.selectedSize = detectedSize;
  }

  const detectedAddress = detectAddressFromText(
    params.messageText,
    session.stage
  );
  if (detectedAddress) {
    session.collectedAddress = detectedAddress;
  }

  const buyIntent =
    /\b(buy|order|book|want|take|send link|payment|pay|checkout|confirm|yes)\b/i.test(
      params.messageText
    );

  if (
    (session.selectedProduct || buyIntent) &&
    session.stage === "pitching" &&
    !session.collectedAddress
  ) {
    session.stage = "collecting_address";
  }

  // If AI Auto-Pilot is turned OFF by Admin, save the customer message and wait for Admin manual reply
  if (!session.aiAutoPilot) {
    await persistStoreDatabase(db);
    return { session };
  }

  const prod1 = db.products[0];
  const prod2 = db.products[1] || db.products[0];
  const bundlePrice = Math.round(
    (prod1.price + prod2.price) *
      (1 - db.settings.bundleDiscountPercent / 100)
  );

  let aiReplyText = "";
  let createdOrder: OrderRecord | undefined;
  let paymentLink: string | undefined;

  // 3. Stage A: Address is collected -> Create Order & Send 1-Click Razorpay Payment Link!
  if (session.collectedAddress && session.stage !== "paid") {
    if (!session.selectedProduct) {
      session.selectedProduct = "set1";
    }
    createdOrder = createOrderForChatSession(db, session);
    paymentLink = `${SITE_URL}/?payOrder=${createdOrder.orderId}`;
    session.orderId = createdOrder.orderId;
    session.paymentLink = paymentLink;
    session.stage = "awaiting_payment";

    const itemSummary = createdOrder.items
      .map((i) => `${i.name} (${i.size})`)
      .join(" + ");

    aiReplyText =
      `🎉 Perfect, ${session.customerName}! I have reserved your APOORVA order from our Aluva, Kerala Atelier:\n\n` +
      `🛍️ *Items:* ${itemSummary}\n` +
      `💰 *Total Payable:* ₹${createdOrder.pricing.total.toLocaleString("en-IN")} (Free Express Air Shipping)\n` +
      `📍 *Delivery Address:* ${session.collectedAddress.addressLine1}, ${session.collectedAddress.city} - ${session.collectedAddress.pincode}\n` +
      `📦 *Order ID:* #${createdOrder.orderId}\n\n` +
      `💳 *Tap your 1-Click Razorpay Link below to complete payment (UPI / GPay / Cards):*\n` +
      `${paymentLink}\n\n` +
      `As soon as payment is completed, your Blue Dart Air Express tracking link will be activated automatically! 🌴`;
  } else {
    // 4. Stage B: Pitching or Collecting Address via Gemini AI Sales Agent
    const history: GeminiMessage[] = session.messages
      .slice(-10, -1)
      .map((m) => ({
        role: m.sender === "customer" ? "user" : "model",
        text: m.text
      }));

    const salesStageInstruction =
      session.stage === "collecting_address"
        ? `CURRENT STAGE: COLLECTING DELIVERY ADDRESS. The customer wants ${
            session.selectedProduct === "both"
              ? `BOTH Sets (2-Set Bundle at ₹${bundlePrice.toLocaleString("en-IN")} with 15% OFF)`
              : session.selectedProduct === "set2"
                ? `Set 02: Coconut & Jute Wrap Beach Set (₹${prod2.price.toLocaleString("en-IN")})`
                : `Set 01: Coconut & Coir Fringe Beach Set (₹${prod1.price.toLocaleString("en-IN")})`
          }. Enthusiastically confirm their choice, briefly mention they can also upgrade to BOTH sets for ₹${bundlePrice.toLocaleString("en-IN")} (15% OFF) if they haven't already, and ask them to reply with their **Full Name, Full Delivery Address, and 6-digit PIN code** so you can immediately generate their 1-Click Razorpay Payment Link in this chat.`
        : `CURRENT STAGE: PITCHING & CONVINCING. Warmly answer the customer's question, convince them why APOORVA's handcrafted biodegradable beachwear from Aluva, Kerala is extraordinary (lined with soft organic cotton felt, 100% ocean & resort pool safe, adjustable braided ties fitting XS-XL, Free 24-48h Air Express delivery), present the prices clearly:\n- Set 01: Coconut & Coir Fringe Beach Set — ₹${prod1.price.toLocaleString("en-IN")}\n- Set 02: Coconut & Jute Wrap Beach Set — ₹${prod2.price.toLocaleString("en-IN")}\n- Complete 2-Set Bundle (Save ${db.settings.bundleDiscountPercent}%) — ₹${bundlePrice.toLocaleString("en-IN")}\nEnd your reply by asking which set they would like to order and inviting them to share their Delivery Address + 6-digit PIN code for an instant Razorpay payment link!`;

    const systemInstruction = `You are the APOORVA Luxury AI Sales Agent across ${params.channel.toUpperCase()} for our handcrafted coastal beachwear house in Aluva, Kerala, India.
Your goal is to:
1. Convince the customer with warm, persuasive coastal luxury storytelling.
2. Help them pick Set 01 (₹${prod1.price}), Set 02 (₹${prod2.price}), or BOTH sets (₹${bundlePrice} with 15% Bundle Discount) and their cup size: S/M (Style A Cup), M/L (Style B Cup), or FREE SIZE (Adjustable Tie).
3. Collect their Full Delivery Address and 6-digit PIN code right here in chat so you can send them an instant Razorpay payment link.
${salesStageInstruction}
Keep your reply concise (3-5 short lines), friendly, persuasive, and formatted for ${params.channel} chat.`;

    const geminiRes = await generateGeminiReply({
      prompt: params.messageText,
      systemInstruction,
      history,
      temperature: 0.65,
      maxOutputTokens: 380
    });

    aiReplyText = geminiRes.text;
  }

  // 5. Append AI reply to session
  const aiMsg: ChatMessage = {
    id: `msg-ai-${Date.now()}`,
    sender: "ai",
    text: aiReplyText,
    timestamp: new Date().toISOString(),
    paymentLink,
    orderId: createdOrder?.orderId
  };
  session.messages.push(aiMsg);
  session.updatedAt = aiMsg.timestamp;

  // 6. Record SocialAutomationEvent in feed
  const evt: SocialAutomationEvent = {
    id: `soc-evt-${Date.now()}`,
    channel: params.channel,
    senderHandleOrPhone: session.customerHandleOrPhone,
    senderName: session.customerName,
    incomingMessage: params.messageText,
    automatedReply: aiReplyText,
    detectedIntent: createdOrder ? "order_created" : "catalog_sent",
    orderId: createdOrder?.orderId,
    amount: createdOrder?.pricing.total,
    timestamp: aiMsg.timestamp
  };
  db.socialEvents = [evt, ...(db.socialEvents || []).slice(0, 49)];

  // 7. Send real outbound message via Meta Graph API (WhatsApp / Instagram / Facebook)
  const outboundDelivery = await dispatchOutboundSocialMessage(
    params.channel,
    session.customerHandleOrPhone,
    aiReplyText
  );

  await persistStoreDatabase(db);

  return {
    session,
    aiReply: aiReplyText,
    paymentLink,
    order: createdOrder,
    outboundDelivery
  };
}

/**
 * Allows the Admin to manually send a message, send a 1-click payment link,
 * or toggle AI Auto-Pilot on any ChatSession.
 */
export async function handleAdminChatAction(params: {
  sessionId: string;
  action: "admin_reply" | "send_payment_link" | "toggle_autopilot";
  messageText?: string;
  aiAutoPilot?: boolean;
  selectedProduct?: "set1" | "set2" | "both";
}): Promise<{
  session: ChatSession | null;
  outboundDelivery?: { sent: boolean; messageId?: string; error?: string };
  order?: OrderRecord;
}> {
  const db = await ensureStoreDatabaseLoaded();
  if (!Array.isArray(db.chatSessions)) {
    db.chatSessions = [];
  }

  const session = db.chatSessions.find((s) => s.id === params.sessionId);
  if (!session) {
    return { session: null };
  }

  if (params.action === "toggle_autopilot") {
    session.aiAutoPilot =
      typeof params.aiAutoPilot === "boolean"
        ? params.aiAutoPilot
        : !session.aiAutoPilot;
    session.updatedAt = new Date().toISOString();
    await persistStoreDatabase(db);
    return { session };
  }

  if (params.selectedProduct) {
    session.selectedProduct = params.selectedProduct;
  }

  let textToSend = (params.messageText || "").trim();
  let paymentLink: string | undefined;
  let createdOrder: OrderRecord | undefined;

  if (params.action === "send_payment_link") {
    createdOrder = createOrderForChatSession(db, session);
    paymentLink = `${SITE_URL}/?payOrder=${createdOrder.orderId}`;
    session.orderId = createdOrder.orderId;
    session.paymentLink = paymentLink;
    session.stage = "awaiting_payment";

    const itemSummary = createdOrder.items
      .map((i) => `${i.name} (${i.size})`)
      .join(" + ");

    textToSend =
      textToSend ||
      `🌴 Hi ${session.customerName}! Here is your direct 1-Click Razorpay Payment Link for Order #${createdOrder.orderId} (${itemSummary} • ₹${createdOrder.pricing.total.toLocaleString("en-IN")} Free Express Shipping):\n\n💳 Pay securely here:\n${paymentLink}`;
  }

  if (!textToSend) {
    return { session };
  }

  const adminMsg: ChatMessage = {
    id: `msg-admin-${Date.now()}`,
    sender: "admin",
    text: textToSend,
    timestamp: new Date().toISOString(),
    paymentLink,
    orderId: createdOrder?.orderId || session.orderId
  };

  session.messages.push(adminMsg);
  session.updatedAt = adminMsg.timestamp;

  const outboundDelivery = await dispatchOutboundSocialMessage(
    session.channel,
    session.customerHandleOrPhone,
    textToSend
  );

  await persistStoreDatabase(db);

  return {
    session,
    outboundDelivery,
    order: createdOrder
  };
}
