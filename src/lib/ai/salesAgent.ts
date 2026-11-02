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
  sendWhatsAppImageMessage,
  sendWhatsAppInteractiveButtons,
  sendMetaSocialDirectMessage
} from "@/lib/meta/whatsapp";

export const MAX_AI_REPLIES_PER_USER = 8;

const rawSiteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.apoorvashells.com"
)
  .trim()
  .replace(/\/+$/, "");

const SITE_URL = rawSiteUrl.includes("apoorva-eight.vercel.app")
  ? "https://www.apoorvashells.com"
  : rawSiteUrl;

const SET1_IMAGE_URL = `${SITE_URL}/images/apoorva_model_editorial.png`;
const SET2_IMAGE_URL = `${SITE_URL}/images/apoorva_coconut_set.png`;

const PRODUCT_BUTTONS = [
  { id: "select_set1", title: "Set 01 (₹4,200)" },
  { id: "select_set2", title: "Set 02 (₹4,500)" },
  { id: "select_both", title: "Both Sets (₹7,395)" }
];

const SIZE_BUTTONS = [
  { id: "size_free", title: "Free Size (Tie)" },
  { id: "size_sm", title: "S/M (Style A)" },
  { id: "size_ml", title: "M/L (Style B)" }
];

function isGreetingOrRestart(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return (
    /^(hi+|hello+|hey+|namaskaram|start|restart|reset|new order|menu)\b/i.test(
      clean
    ) ||
    clean.includes("interested in learning more") ||
    clean.includes("start over")
  );
}

function isHumanHandoverRequest(text: string): boolean {
  const q = text.toLowerCase();
  return /\b(human|real person|talk to someone|call me|customer care|support team|manager|owner|agent|custom size|bulk order|wholesale)\b/.test(
    q
  );
}

function detectProductChoice(
  text: string,
  stage?: ChatSession["stage"]
): "set1" | "set2" | "both" | undefined {
  const clean = text.trim();
  const upper = clean.toUpperCase();

  // If the customer is asking a comparison/doubt question about Set 1 vs Set 2, treat as a doubt rather than locking a choice
  const isDoubtOrComparison =
    /\b(DIFFERENCE|COMPARE|WHICH IS BETTER|TELL ME ABOUT|EXPLAIN|WHY|COMFORT|ITCH|WATER|SWIM|HEAVY)\b/.test(
      upper
    ) && !/\b(SELECT_|BUY|ORDER|BOOK|WANT|TAKE|GET)\b/.test(upper);

  if (isDoubtOrComparison) {
    return undefined;
  }

  if (
    upper === "SELECT_BOTH" ||
    upper.includes("BOTH SETS") ||
    upper.includes("BOTH") ||
    upper.includes("BUNDLE") ||
    upper.includes("2 SETS") ||
    upper.includes("TWO SETS") ||
    upper.includes("7395") ||
    upper.includes("7,395") ||
    (stage === "pitching" && clean === "3")
  ) {
    return "both";
  }

  if (
    upper === "SELECT_SET2" ||
    upper.includes("SET 2") ||
    upper.includes("SET2") ||
    upper.includes("SET 02") ||
    upper.includes("JUTE WRAP") ||
    upper.includes("4500") ||
    upper.includes("4,500") ||
    (stage === "pitching" && clean === "2")
  ) {
    return "set2";
  }

  if (
    upper === "SELECT_SET1" ||
    upper.includes("SET 1") ||
    upper.includes("SET1") ||
    upper.includes("SET 01") ||
    upper.includes("COIR FRINGE") ||
    upper.includes("4200") ||
    upper.includes("4,200") ||
    (stage === "pitching" && clean === "1")
  ) {
    return "set1";
  }

  return undefined;
}

function detectSizeChoice(
  text: string,
  stage?: ChatSession["stage"]
): string | undefined {
  const clean = text.trim();
  const upper = clean.toUpperCase();

  // If they are asking "what size should I get?" or "how do sizes work?", treat as a doubt
  if (/\b(WHAT|WHICH|HOW|CONFUSED|DOUBT|GUIDE|CHART|FIT ME)\b/.test(upper)) {
    return undefined;
  }

  if (
    upper === "SIZE_FREE" ||
    upper.includes("FREE SIZE") ||
    upper === "FREE" ||
    upper.includes("(TIE)") ||
    (stage === "collecting_size" && clean === "1")
  ) {
    return "FREE SIZE (Adjustable Tie)";
  }
  if (
    upper === "SIZE_SM" ||
    upper.includes("S/M") ||
    upper.includes("STYLE A") ||
    upper === "S" ||
    upper === "M" ||
    upper === "SM" ||
    (stage === "collecting_size" && clean === "2")
  ) {
    return "S/M (Style A Cup)";
  }
  if (
    upper === "SIZE_ML" ||
    upper.includes("M/L") ||
    upper.includes("STYLE B") ||
    upper === "L" ||
    upper === "XL" ||
    upper === "ML" ||
    (stage === "collecting_size" && clean === "3")
  ) {
    return "M/L (Style B Cup)";
  }
  return undefined;
}

/**
 * Detects if the customer is asking a doubt, objection, or question that needs convincing.
 */
async function buildPersuasiveDoubtAnswer(params: {
  text: string;
  session: ChatSession;
  prod1Price: number;
  prod2Price: number;
  bundlePrice: number;
  discountPct: number;
}): Promise<string | null> {
  const { text, session, prod1Price, prod2Price, bundlePrice, discountPct } =
    params;
  const q = text.trim().toLowerCase();

  // Ignore simple button taps or greetings
  if (
    isGreetingOrRestart(q) ||
    /^(select_set1|select_set2|select_both|size_free|size_sm|size_ml|1|2|3)$/i.test(
      q
    )
  ) {
    return null;
  }

  // 1. Comfort, Itchiness, Skin Feel, Weight
  if (
    /\b(comfort|comfortable|itch|itchy|scratch|hard|heavy|hurt|skin|lining|inside|wear|feel)\b/.test(
      q
    )
  ) {
    return (
      `✨ *100% Cloud-Soft Against Skin:*\n` +
      `Every coconut shell cup is fully lined inside with *2mm breathable organic malmal cotton felt*, and our tender Kerala coir & jute are triple-combed so there is *zero itch or rubbing* — even during all-day beach & pool wear!`
    );
  }

  // 2. Water, Ocean, Swimming, Pool, Washing, Durability
  if (
    /\b(water|swim|swimming|ocean|sea|pool|wet|wash|care|crack|break|durable|rain|salt)\b/.test(
      q
    )
  ) {
    return (
      `🌊 *100% Ocean & Resort Pool Ready:*\n` +
      `Our shells are triple-cured in cold-pressed Kerala virgin coconut oil, so they naturally repel saltwater & chlorine without cracking or fading. Just rinse in fresh water after your swim and pat dry!`
    );
  }

  // 3. Sizing, Fit, Cup Size, Body Type, Measurements
  if (
    /\b(size|sizing|fit|cup|bust|waist|small|medium|large|xs|xl|measurement|style a|style b|tie|adjustable)\b/.test(
      q
    )
  ) {
    return (
      `👙 *Effortless Custom Fit (XS to XL):*\n` +
      `We use our signature *"cut a cap, don't split in half"* contour so the cups hug naturally:\n` +
      `• *Free Size (Tie)*: Adjustable braided cords fit XS–XL (Best for gifting!)\n` +
      `• *S/M (Style A)*: Sleek oval contour for A/B/C cups\n` +
      `• *M/L (Style B)*: Deeper sculpted support for C/D+ cups`
    );
  }

  // 4. Difference / Comparison between Set 01 and Set 02 / Recommendation
  if (
    /\b(difference|compare|which one|better|recommend|suggest|set 1 or set 2|detail|explain|about)\b/.test(
      q
    )
  ) {
    return (
      `🐚 *How to Choose Your Set:*\n` +
      `• *Set 01 (Coir Fringe — ₹${prod1Price.toLocaleString("en-IN")})*: Playful kinetic hula fringe skirt that sways with every step — our #1 bestseller for sunset walks & beach parties.\n` +
      `• *Set 02 (Jute Wrap — ₹${prod2Price.toLocaleString("en-IN")})*: Tailored cotton-lined fine jute A-line wrap skirt with a coconut buckle & 3 shell buttons.\n` +
      `💡 *Most guests grab Both Sets for ₹${bundlePrice.toLocaleString("en-IN")} (Save ${discountPct}% / ₹1,305 OFF)!*`
    );
  }

  // 5. Price, Discount, Offer, Expensive, Worth It
  if (
    /\b(price|cost|discount|offer|promo|coupon|expensive|cheap|less|bargain|worth|deal)\b/.test(
      q
    )
  ) {
    return (
      `🌴 *Artisanal Value & Instant ${discountPct}% Savings:*\n` +
      `Each piece takes 3 days of hand-carving, organic cotton lining, and weaving by master artisans in Aluva, Kerala. While Set 01 is *₹${prod1Price.toLocaleString("en-IN")}* and Set 02 is *₹${prod2Price.toLocaleString("en-IN")}*, you can get *Both Sets together for ₹${bundlePrice.toLocaleString("en-IN")} (${discountPct}% OFF)* + *Free Express Air Shipping*!`
    );
  }

  // 6. Shipping, Delivery Time, Urgent Trip, Goa/Mumbai/Kochi
  if (
    /\b(ship|shipping|deliver|delivery|days|fast|urgent|when|reach|goa|mumbai|kochi|kerala|bangalore|delhi|courier|track)\b/.test(
      q
    )
  ) {
    return (
      `✈️ *Free Express Air Shipping (24–72 Hours):*\n` +
      `We dispatch directly from our Aluva, Kerala atelier via *Blue Dart Air Express*! Deliveries to Kochi & Kerala arrive in *24–48 hours*, and Goa, Mumbai, Bengaluru, Delhi & pan-India arrive in *2–3 business days* with live AWB tracking.`
    );
  }

  // 7. COD, Payment Safety, Trust, Return/Exchange
  if (
    /\b(cod|cash on delivery|trust|safe|secure|refund|return|exchange|pay|upi|razorpay)\b/.test(
      q
    )
  ) {
    return (
      `🔒 *100% Verified Razorpay Checkout:*\n` +
      `Because each resort piece is hygienically handcrafted to order, we operate on *100% secure prepaid checkout via Razorpay (UPI / GPay / PhonePe / Cards)*. You receive your GST invoice & Blue Dart Air tracking number the moment you pay!`
    );
  }

  // 8. Any other conversational question or doubt -> Use Gemini AI (with concise 2-3 line instruction)
  const history: GeminiMessage[] = session.messages
    .slice(-6, -1)
    .map((m) => ({
      role: m.sender === "customer" ? "user" : "model",
      text: m.text
    }));

  const geminiRes = await generateGeminiReply({
    prompt: text,
    history,
    temperature: 0.6,
    maxOutputTokens: 180,
    systemInstruction: `You are the warm, persuasive human-like luxury stylist for APOORVA SHELLS (Aluva, Kerala handcrafted coconut shell, coir fringe & jute resortwear).
Clear the customer's doubt in 2 to 3 short, friendly sentences using single *asterisks* for bold text.
Key facts to convince them:
- Lined inside with 2mm soft organic malmal cotton felt (zero itch, super comfortable).
- Triple-cured in virgin coconut oil (100% ocean & pool safe).
- Signature "cut a cap, don't split in half" flattering anatomical curve + adjustable braided ties (fits XS to XL).
- Set 01 (Coir Fringe Set): ₹${prod1Price.toLocaleString("en-IN")} | Set 02 (Jute Wrap Set): ₹${prod2Price.toLocaleString("en-IN")} | Both Sets Bundle: ₹${bundlePrice.toLocaleString("en-IN")} (15% OFF).
- Free 2-3 day Blue Dart Air Express shipping across India.
Do NOT ask for their address in chat (we use a 2-tap button flow). Keep it under 55 words.`
  });

  if (geminiRes && !geminiRes.fromFallback && geminiRes.text) {
    return geminiRes.text.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  }

  return (
    `🌴 Handcrafted at our Aluva, Kerala atelier, every *APOORVA SHELLS* set is lined with soft organic cotton, 100% ocean-safe, and ships free via *Blue Dart Air Express* (2–3 days across India)!`
  );
}

export function buildPaymentUrlForOrder(order: OrderRecord): string {
  const isBoth = order.items.length >= 2;
  const isSet2 =
    !isBoth &&
    (order.items[0]?.productId?.includes("02") ||
      order.items[0]?.name?.toUpperCase().includes("JUTE"));
  const setCode = isBoth ? "both" : isSet2 ? "set2" : "set1";
  const size = order.items[0]?.size || "FREE SIZE (Adjustable Tie)";

  const cleanName =
    order.customer.fullName &&
    !order.customer.fullName.includes("Guest") &&
    !order.customer.fullName.includes("Client")
      ? order.customer.fullName
      : "";

  const params = new URLSearchParams({
    set: setCode,
    size,
    phone: order.customer.phone || "",
    total: String(order.pricing.total)
  });

  if (cleanName) params.set("name", cleanName);
  if (order.customer.email && !order.customer.email.includes("@social.")) {
    params.set("email", order.customer.email);
  }
  if (
    order.customer.addressLine1 &&
    order.customer.addressLine1 !== "Pending Checkout Address"
  ) {
    params.set("addr", order.customer.addressLine1);
  }
  if (order.customer.pincode) {
    params.set("pin", order.customer.pincode);
  }
  if (order.customer.city) {
    params.set("city", order.customer.city);
  }
  if (order.customer.state) {
    params.set("state", order.customer.state);
  }

  return `${SITE_URL}/pay/${encodeURIComponent(order.orderId)}?${params.toString()}`;
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

  const phoneDigits = session.customerHandleOrPhone.replace(/\D/g, "");
  const cleanPhone =
    phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";

  const addr = session.collectedAddress || {
    addressLine1: session.collectedAddressLine || "Pending Checkout Address",
    city: "Kochi",
    state: "Kerala",
    pincode: session.collectedPincode || ""
  };

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
      fullName: session.collectedName || session.customerName || "Valued Guest",
      email: `${session.customerHandleOrPhone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "guest"}@social.apoorvashells.com`,
      phone: cleanPhone,
      addressLine1: addr.addressLine1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: "India",
      orderNotes: `2-Tap ${session.channel.toUpperCase()} Express Order`
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

  recordOrderInStore(newOrder, db);
  return newOrder;
}

function getProductShortLabel(
  choice: "set1" | "set2" | "both",
  prod1Price: number,
  prod2Price: number,
  bundlePrice: number
): string {
  if (choice === "both") {
    return `Both Sets Bundle (₹${bundlePrice.toLocaleString("en-IN")} — 15% OFF)`;
  }
  if (choice === "set2") {
    return `Set 02: Coconut & Jute Wrap Set (₹${prod2Price.toLocaleString("en-IN")})`;
  }
  return `Set 01: Coconut & Coir Fringe Set (₹${prod1Price.toLocaleString("en-IN")})`;
}

/**
 * Processes an incoming customer message on WhatsApp, Instagram, Facebook, or Website.
 * Architecture:
 *   1. Visual Welcome: Sends Set 01 & Set 02 photos + 3 tap buttons (`Set 01`, `Set 02`, `Both Sets`)
 *   2. Persuasive Doubt Clearing: Answers any customer doubt (comfort, water, size, price, shipping) in 2-3 lines + re-shows the tap buttons
 *   3. 2-Tap Express Checkout: Set button -> Size button -> Instant `/pay/APV-XXXXX` link (Phone pre-filled; Name, Email, Address & PIN collected on checkout page)
 *   4. 8-Message AI Runway + Human Handover: After 8 AI replies (or if customer asks for a human), AI sends a warm handover message, sets `aiAutoPilot = false`, and waits for human interaction!
 */
export async function processIncomingSalesChat(params: {
  channel: "whatsapp" | "instagram" | "facebook" | "website";
  customerHandleOrPhone: string;
  customerName?: string;
  messageText: string;
  sessionId?: string;
  commentId?: string;
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
  const incomingText = params.messageText.trim();

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
      aiRepliesCount: 0,
      handedOverToHuman: false,
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
    db.chatSessions = [
      session,
      ...db.chatSessions.filter((s) => s.id !== session!.id)
    ];
  }

  // Record incoming customer message
  const customerMsg: ChatMessage = {
    id: `msg-cust-${Date.now()}`,
    sender: "customer",
    text: incomingText,
    timestamp: nowIso
  };
  session.messages.push(customerMsg);
  session.updatedAt = nowIso;

  // If user explicitly sends "restart" or "reset", re-enable AI & reset counter so they can test from scratch
  if (/^(restart|reset|start over)$/i.test(incomingText)) {
    session.aiAutoPilot = true;
    session.aiRepliesCount = 0;
    session.handedOverToHuman = false;
  }

  // If AI Auto-Pilot is turned OFF (either manually by Admin or after 8-message human handover), wait for human interaction!
  if (!session.aiAutoPilot) {
    await persistStoreDatabase(db);
    return { session };
  }

  const currentAiCount = session.aiRepliesCount ?? 0;

  // Check if customer reached the 8 AI replies limit OR asked to talk to a human
  if (
    currentAiCount >= MAX_AI_REPLIES_PER_USER ||
    isHumanHandoverRequest(incomingText)
  ) {
    session.aiAutoPilot = false;
    session.handedOverToHuman = true;
    session.aiRepliesCount = currentAiCount + 1;

    const handoverLink = session.paymentLink || SITE_URL;
    const handoverText =
      `🤍 I've connected your chat with our senior stylist at the *APOORVA SHELLS Aluva Atelier*! A team member will reply to you personally right here shortly.\n\n` +
      `Meanwhile, you can also view or complete your order anytime here:\n${handoverLink}`;

    const handoverMsg: ChatMessage = {
      id: `msg-ai-${Date.now()}`,
      sender: "ai",
      text: handoverText,
      timestamp: new Date().toISOString(),
      paymentLink: session.paymentLink,
      orderId: session.orderId
    };
    session.messages.push(handoverMsg);
    session.updatedAt = handoverMsg.timestamp;

    await persistStoreDatabase(db);

    let outboundDelivery: { sent: boolean; messageId?: string; error?: string } =
      { sent: true, messageId: `web-${Date.now()}` };

    if (params.channel === "whatsapp") {
      outboundDelivery = await sendWhatsAppTextMessage({
        to: session.customerHandleOrPhone,
        body: handoverText,
        previewUrl: true
      });
    } else if (
      params.channel === "instagram" ||
      params.channel === "facebook"
    ) {
      outboundDelivery = await sendMetaSocialDirectMessage({
        channel: params.channel,
        recipientId: session.customerHandleOrPhone,
        body: handoverText
      });
    }

    return {
      session,
      aiReply: handoverText,
      paymentLink: session.paymentLink,
      outboundDelivery
    };
  }

  const prod1 = db.products[0];
  const prod2 = db.products[1] || db.products[0];
  const bundlePrice = Math.round(
    (prod1.price + prod2.price) *
      (1 - db.settings.bundleDiscountPercent / 100)
  );

  const detectedSetFromMsg = detectProductChoice(incomingText, session.stage);
  const detectedSizeFromMsg = detectSizeChoice(incomingText, session.stage);

  // Reset order selection if user greets fresh
  if (isGreetingOrRestart(incomingText)) {
    session.stage = "pitching";
    session.selectedProduct = undefined;
    session.selectedSize = undefined;
    session.orderId = undefined;
    session.paymentLink = undefined;
    session.imagesSent = false;
  } else if (
    (session.stage === "awaiting_payment" || session.stage === "paid") &&
    detectedSetFromMsg
  ) {
    session.stage = "collecting_size";
    session.selectedProduct = detectedSetFromMsg;
    session.selectedSize = detectedSizeFromMsg;
    session.orderId = undefined;
    session.paymentLink = undefined;
  }

  // Also support 1-line pipe-separated simulator messages (e.g. "SET 1 | Niyas | Villa 12, Kochi - PIN 682001")
  if (incomingText.includes("|")) {
    const parts = incomingText.split("|").map((p) => p.trim());
    const setPart = detectProductChoice(parts[0] || "", "pitching");
    session.selectedProduct = setPart || "set1";
    session.selectedSize = "FREE SIZE (Adjustable Tie)";
    if (parts[1]) {
      session.collectedName = parts[1];
      session.customerName = parts[1];
    }
    if (parts[2]) {
      const pinMatch = parts[2].match(/\b([1-8]\d{5})\b/);
      if (pinMatch) session.collectedPincode = pinMatch[1];
      session.collectedAddressLine = parts[2]
        .replace(/[-,\s]*(pin\s*)?\b[1-8]\d{5}\b/gi, "")
        .trim();
    }
  } else {
    if (detectedSetFromMsg) {
      session.selectedProduct = detectedSetFromMsg;
      // If they switched sets, let them confirm size unless they also specified size in the same message
      if (!detectedSizeFromMsg) {
        session.selectedSize = undefined;
        session.stage = "collecting_size";
      }
    }
    if (detectedSizeFromMsg) {
      session.selectedSize = detectedSizeFromMsg;
    }
  }

  let aiReplyText = "";
  let createdOrder: OrderRecord | undefined;
  let paymentLink: string | undefined;
  let replyButtons: Array<{ id: string; title: string }> | undefined;
  let attachProductImages = false;

  // Check if the customer is asking a doubt/question rather than tapping a Set/Size button
  const isActionTap = Boolean(
    detectedSetFromMsg ||
      detectedSizeFromMsg ||
      incomingText.includes("|") ||
      isGreetingOrRestart(incomingText)
  );

  const persuasiveAnswer = !isActionTap
    ? await buildPersuasiveDoubtAnswer({
        text: incomingText,
        session,
        prod1Price: prod1.price,
        prod2Price: prod2.price,
        bundlePrice,
        discountPct: db.settings.bundleDiscountPercent
      })
    : null;

  if (persuasiveAnswer) {
    // Customer asked a doubt! Answer persuasively in 2-3 lines AND re-show the appropriate tap buttons / link
    if (!session.selectedProduct) {
      replyButtons = PRODUCT_BUTTONS;
      aiReplyText = `${persuasiveAnswer}\n\nWhich set would you like to try? Tap below 👇`;
    } else if (!session.selectedSize) {
      replyButtons = SIZE_BUTTONS;
      const setLabel = getProductShortLabel(
        session.selectedProduct,
        prod1.price,
        prod2.price,
        bundlePrice
      );
      aiReplyText = `${persuasiveAnswer}\n\nWhich fit would you like for your *${setLabel}*? Tap below 👇`;
    } else if (session.paymentLink) {
      paymentLink = session.paymentLink;
      aiReplyText =
        `${persuasiveAnswer}\n\n` +
        `💳 *Your reserved order (#${session.orderId}) is ready — tap below to complete checkout:*\n${session.paymentLink}`;
    } else {
      replyButtons = PRODUCT_BUTTONS;
      aiReplyText = `${persuasiveAnswer}\n\nWhich set would you like? Tap below 👇`;
    }
  } else if (!session.selectedProduct) {
    // TAP 0: Greeting -> Show Set 01 & Set 02 Photos + 3 Interactive Set Tap Buttons
    session.stage = "pitching";
    attachProductImages = !session.imagesSent;
    session.imagesSent = true;
    replyButtons = PRODUCT_BUTTONS;

    aiReplyText =
      `Hi! Welcome to *APOORVA SHELLS* 🐚\n\n` +
      `Here are our 2 handcrafted Kerala coconut shell beachwear sets (lined with soft organic cotton & 100% ocean-safe):\n` +
      `1️⃣ *Set 01: Coir Fringe Set* — ₹${prod1.price.toLocaleString("en-IN")}\n` +
      `2️⃣ *Set 02: Jute Wrap Set* — ₹${prod2.price.toLocaleString("en-IN")}\n` +
      `🎁 *Both Sets Bundle* — ₹${bundlePrice.toLocaleString("en-IN")} (15% OFF)\n\n` +
      `Which set would you like, or do you have any questions? 👇`;
  } else if (!session.selectedSize) {
    // TAP 1: Set Chosen -> Ask Size/Fit with 3 Interactive Tap Buttons
    session.stage = "collecting_size";
    replyButtons = SIZE_BUTTONS;
    const setLabel = getProductShortLabel(
      session.selectedProduct,
      prod1.price,
      prod2.price,
      bundlePrice
    );

    aiReplyText =
      `Lovely choice! ✨ I've selected *${setLabel}*.\n\n` +
      `Which fit would you like? Tap below 👇`;
  } else {
    // TAP 2: Set + Size Chosen -> Immediately Create Order & Send Express Checkout Link!
    createdOrder = createOrderForChatSession(db, session);
    paymentLink = buildPaymentUrlForOrder(createdOrder);
    session.orderId = createdOrder.orderId;
    session.paymentLink = paymentLink;
    session.stage = "awaiting_payment";

    const itemSummary = createdOrder.items
      .map((i) => `${i.name} (${i.size})`)
      .join(" + ");

    aiReplyText =
      `🎉 Awesome! I've reserved your *APOORVA SHELLS* piece from our Aluva, Kerala Atelier:\n\n` +
      `🛍️ *Set:* ${itemSummary}\n` +
      `💰 *Total:* ₹${createdOrder.pricing.total.toLocaleString("en-IN")} (Free Express Air Shipping)\n` +
      `📦 *Order ID:* #${createdOrder.orderId}\n\n` +
      `👇 *Tap below to enter your delivery address & pay securely via Razorpay (UPI / GPay / Cards):*\n` +
      `${paymentLink}`;
  }

  // Increment AI reply count for this user (out of MAX_AI_REPLIES_PER_USER = 8)
  session.aiRepliesCount = currentAiCount + 1;

  const productImagesList = attachProductImages
    ? [
        {
          url: SET1_IMAGE_URL,
          caption: `🐚 *Set 01: Coconut & Coir Fringe Set* — *₹${prod1.price.toLocaleString("en-IN")}*\nHand-polished Kerala coconut shell top + tender coir fringe skirt.`
        },
        {
          url: SET2_IMAGE_URL,
          caption: `🌴 *Set 02: Coconut & Jute Wrap Set* — *₹${prod2.price.toLocaleString("en-IN")}*\nCoconut shell top + cotton-lined fine jute wrap skirt with shell buttons.`
        }
      ]
    : undefined;

  // Append AI reply to session
  const aiMsg: ChatMessage = {
    id: `msg-ai-${Date.now()}`,
    sender: "ai",
    text: aiReplyText,
    timestamp: new Date().toISOString(),
    paymentLink,
    orderId: createdOrder?.orderId,
    images: productImagesList,
    quickReplies: replyButtons
  };
  session.messages.push(aiMsg);
  session.updatedAt = aiMsg.timestamp;

  // Record SocialAutomationEvent in feed
  const evt: SocialAutomationEvent = {
    id: `soc-evt-${Date.now()}`,
    channel: params.channel,
    senderHandleOrPhone: session.customerHandleOrPhone,
    senderName: session.customerName,
    incomingMessage: incomingText,
    automatedReply: aiReplyText,
    detectedIntent: createdOrder ? "order_created" : "catalog_sent",
    orderId: createdOrder?.orderId,
    amount: createdOrder?.pricing.total,
    timestamp: aiMsg.timestamp
  };
  db.socialEvents = [evt, ...(db.socialEvents || []).slice(0, 49)];

  // Persist database BEFORE dispatching outbound messages so the order is 100% live in MongoDB immediately
  await persistStoreDatabase(db);

  // Dispatch outbound messages on WhatsApp / Instagram / Facebook
  let outboundDelivery: { sent: boolean; messageId?: string; error?: string } =
    { sent: true, messageId: `web-${Date.now()}` };

  if (params.channel === "whatsapp") {
    if (productImagesList && productImagesList.length > 0) {
      for (const img of productImagesList) {
        await sendWhatsAppImageMessage({
          to: session.customerHandleOrPhone,
          imageUrl: img.url,
          caption: img.caption
        });
      }
    }

    if (replyButtons && replyButtons.length > 0) {
      outboundDelivery = await sendWhatsAppInteractiveButtons({
        to: session.customerHandleOrPhone,
        bodyText: aiReplyText,
        footerText: "APOORVA SHELLS • Aluva, Kerala",
        buttons: replyButtons
      });
    } else {
      outboundDelivery = await sendWhatsAppTextMessage({
        to: session.customerHandleOrPhone,
        body: aiReplyText,
        previewUrl: true
      });
    }
  } else if (params.channel === "instagram" || params.channel === "facebook") {
    outboundDelivery = await sendMetaSocialDirectMessage({
      channel: params.channel,
      recipientId: session.customerHandleOrPhone,
      body: aiReplyText,
      images: productImagesList,
      buttons: replyButtons,
      commentId: params.commentId
    });
  }

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
    if (session.aiAutoPilot) {
      // Reset the 8-reply AI runway when Admin re-enables Auto-Pilot
      session.aiRepliesCount = 0;
      session.handedOverToHuman = false;
    }
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
    paymentLink = buildPaymentUrlForOrder(createdOrder);
    session.orderId = createdOrder.orderId;
    session.paymentLink = paymentLink;
    session.stage = "awaiting_payment";

    const itemSummary = createdOrder.items
      .map((i) => `${i.name} (${i.size})`)
      .join(" + ");

    textToSend =
      textToSend ||
      `🌴 Hi *${session.customerName}*! Here is your direct 1-Click Razorpay Checkout Link for Order *#${createdOrder.orderId}* (${itemSummary} • *₹${createdOrder.pricing.total.toLocaleString("en-IN")}* Free Express Shipping):\n\n💳 Tap to enter delivery address & pay:\n${paymentLink}`;
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

  await persistStoreDatabase(db);

  let outboundDelivery: { sent: boolean; messageId?: string; error?: string } =
    { sent: true, messageId: `web-${Date.now()}` };

  if (session.channel === "whatsapp") {
    outboundDelivery = await sendWhatsAppTextMessage({
      to: session.customerHandleOrPhone,
      body: textToSend,
      previewUrl: true
    });
  } else if (session.channel === "instagram" || session.channel === "facebook") {
    outboundDelivery = await sendMetaSocialDirectMessage({
      channel: session.channel,
      recipientId: session.customerHandleOrPhone,
      body: textToSend
    });
  }

  return {
    session,
    outboundDelivery,
    order: createdOrder
  };
}
