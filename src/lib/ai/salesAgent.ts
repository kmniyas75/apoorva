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
import {
  sendWhatsAppTextMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppInteractiveButtons,
  sendMetaSocialDirectMessage
} from "@/lib/meta/whatsapp";

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
    /^(hi+|hello+|hey+|namaskaram|start|restart|reset|new order|menu|help)\b/i.test(
      clean
    ) ||
    clean.includes("interested in learning more") ||
    clean.includes("start over")
  );
}

function detectProductChoice(
  text: string,
  stage?: ChatSession["stage"]
): "set1" | "set2" | "both" | undefined {
  const clean = text.trim();
  const upper = clean.toUpperCase();

  if (
    upper === "SELECT_BOTH" ||
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
    upper.includes("JUTE") ||
    upper.includes("WRAP") ||
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
    upper.includes("COIR") ||
    upper.includes("FRINGE") ||
    upper.includes("HULA") ||
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

  if (
    upper === "SIZE_FREE" ||
    upper.includes("FREE SIZE") ||
    upper.includes("FREE") ||
    upper.includes("TIE") ||
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

function resolveCityAndStateFromPincode(
  pincode: string,
  addressText: string
): { city: string; state: string } {
  const text = addressText.toLowerCase();
  if (
    pincode.startsWith("68") ||
    pincode.startsWith("69") ||
    pincode.startsWith("67") ||
    /kerala|kochi|aluva|varkala|kovalam|trivandrum|thiruvananthapuram|calicut|kozhikode|thrissur|kottayam|ernakulam/i.test(
      text
    )
  ) {
    const city = /aluva/i.test(text)
      ? "Aluva"
      : /varkala/i.test(text)
        ? "Varkala"
        : /trivandrum|thiruvananthapuram|kovalam/i.test(text)
          ? "Thiruvananthapuram"
          : /calicut|kozhikode/i.test(text)
            ? "Kozhikode"
            : /thrissur/i.test(text)
              ? "Thrissur"
              : "Kochi";
    return { city, state: "Kerala" };
  }
  if (
    pincode.startsWith("403") ||
    /goa|candolim|calangute|anjuna|panjim|panaji|baga|morjim/i.test(text)
  ) {
    return { city: "North Goa", state: "Goa" };
  }
  if (pincode.startsWith("400") || /mumbai|bandra|juhu|andheri|colaba/i.test(text)) {
    return { city: "Mumbai", state: "Maharashtra" };
  }
  if (pincode.startsWith("411") || /pune/i.test(text)) {
    return { city: "Pune", state: "Maharashtra" };
  }
  if (pincode.startsWith("56") || /bangalore|bengaluru/i.test(text)) {
    return { city: "Bengaluru", state: "Karnataka" };
  }
  if (pincode.startsWith("11") || /delhi|new delhi/i.test(text)) {
    return { city: "New Delhi", state: "Delhi NCR" };
  }
  if (pincode.startsWith("122") || /gurgaon|gurugram/i.test(text)) {
    return { city: "Gurugram", state: "Haryana" };
  }
  if (pincode.startsWith("201") || /noida/i.test(text)) {
    return { city: "Noida", state: "Uttar Pradesh" };
  }
  if (pincode.startsWith("60") || /chennai|pondicherry|puducherry/i.test(text)) {
    return { city: "Chennai", state: "Tamil Nadu" };
  }
  if (pincode.startsWith("50") || /hyderabad/i.test(text)) {
    return { city: "Hyderabad", state: "Telangana" };
  }
  if (pincode.startsWith("70") || /kolkata/i.test(text)) {
    return { city: "Kolkata", state: "West Bengal" };
  }
  if (pincode.startsWith("38") || /ahmedabad/i.test(text)) {
    return { city: "Ahmedabad", state: "Gujarat" };
  }
  if (pincode.startsWith("30") || /jaipur/i.test(text)) {
    return { city: "Jaipur", state: "Rajasthan" };
  }
  return { city: "Kochi", state: "Kerala" };
}

function isValidCustomerName(input: string): boolean {
  const clean = input.trim();
  if (clean.length < 2 || clean.length > 60) return false;
  if (/^\d+$/.test(clean)) return false;
  if (
    /^(ok|okay|yes|no|sure|hi|hello|hey|set\s*1|set\s*2|both|free\s*size|s\/m|m\/l|buy|order|pay|link)$/i.test(
      clean
    )
  ) {
    return false;
  }
  return /[a-zA-Z]{2,}/.test(clean);
}

function isValidAddressLine(input: string): boolean {
  const withoutPin = input.replace(/\b[1-8]\d{5}\b/g, "").trim();
  if (withoutPin.length < 4) return false;
  if (
    /^(ok|okay|yes|no|sure|hi|hello|hey|set\s*1|set\s*2|both|free\s*size)$/i.test(
      withoutPin
    )
  ) {
    return false;
  }
  return /[a-zA-Z]{3,}/.test(withoutPin);
}

export function buildPaymentUrlForOrder(order: OrderRecord): string {
  const isBoth = order.items.length >= 2;
  const isSet2 =
    !isBoth &&
    (order.items[0]?.productId?.includes("02") ||
      order.items[0]?.name?.toUpperCase().includes("JUTE"));
  const setCode = isBoth ? "both" : isSet2 ? "set2" : "set1";
  const size = order.items[0]?.size || "FREE SIZE (Adjustable Tie)";

  const params = new URLSearchParams({
    set: setCode,
    size,
    name: order.customer.fullName || "",
    phone: order.customer.phone || "",
    addr: order.customer.addressLine1 || "",
    city: order.customer.city || "Kochi",
    state: order.customer.state || "Kerala",
    pin: order.customer.pincode || "",
    total: String(order.pricing.total)
  });

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

  const finalPincode =
    session.collectedPincode || session.collectedAddress?.pincode || "683101";
  const finalAddressLine =
    session.collectedAddressLine ||
    session.collectedAddress?.addressLine1 ||
    "Coastal Resort Delivery";
  const resolvedGeo = resolveCityAndStateFromPincode(
    finalPincode,
    finalAddressLine
  );
  const addr = {
    addressLine1: finalAddressLine,
    city: session.collectedAddress?.city || resolvedGeo.city,
    state: session.collectedAddress?.state || resolvedGeo.state,
    pincode: finalPincode
  };
  session.collectedAddress = addr;

  const finalCustomerName =
    session.collectedName || session.customerName || "Valued Guest";
  session.customerName = finalCustomerName;

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
      fullName: finalCustomerName,
      email: `${session.customerHandleOrPhone.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "guest"}@social.apoorvashells.com`,
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
 * Answers specific questions briefly (1-2 human lines) before guiding back to the current step.
 */
function buildShortFaqPrefix(text: string): string {
  const q = text.toLowerCase();
  if (/\b(water|swim|ocean|pool|wash|wet)\b/.test(q)) {
    return "🥥 Yes! Our shells are sealed with Kerala virgin coconut oil and lined with soft organic cotton — 100% ocean & pool safe.\n\n";
  }
  if (/\b(ship|delivery|days|fast|courier|when)\b/.test(q)) {
    return "🚚 We ship free via *Blue Dart Air Express* from Aluva, Kerala (delivers in 2–3 days across India).\n\n";
  }
  if (/\b(cod|cash on delivery)\b/.test(q)) {
    return "💳 Because each set is handcrafted to order, we accept 100% secure online payment via *Razorpay (UPI / GPay / PhonePe / Cards)*.\n\n";
  }
  return "";
}

/**
 * Processes an incoming customer message on WhatsApp, Instagram, Facebook, or Website.
 * Uses a human, interactive, one-question-at-a-time flow with product images and tap buttons:
 *   1. Pick Set (sends Set 01 & Set 02 images + 3 tap buttons)
 *   2. Pick Size (sends 3 tap buttons: Free Size, S/M, M/L)
 *   3. Collect Full Name (validates name)
 *   4. Collect Delivery Address (validates street/house/city)
 *   5. Collect 6-digit PIN Code (validates 6 digits — never guesses!)
 *   6. Creates order & sends direct `/pay/APV-XXXXX` payment link!
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
      messages: [],
      updatedAt: nowIso
    };
    db.chatSessions.unshift(session);
  } else {
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

  // If AI Auto-Pilot is turned OFF by Admin, save message and wait for Admin manual reply
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

  // If customer greets or restarts, or starts a fresh selection after completing an order, reset order fields
  const detectedSetFromMsg = detectProductChoice(incomingText, session.stage);
  if (
    isGreetingOrRestart(incomingText) ||
    ((session.stage === "awaiting_payment" || session.stage === "paid") &&
      detectedSetFromMsg)
  ) {
    session.stage = "pitching";
    session.selectedProduct = detectedSetFromMsg;
    session.selectedSize = undefined;
    session.collectedName = undefined;
    session.collectedAddressLine = undefined;
    session.collectedPincode = undefined;
    session.collectedAddress = undefined;
    session.orderId = undefined;
    session.paymentLink = undefined;
    session.imagesSent = false;
  }

  // Also support 1-line pipe-separated simulator messages (e.g. "SET 1 | Niyas | Villa 12, Kochi - PIN 682001")
  if (incomingText.includes("|")) {
    const parts = incomingText.split("|").map((p) => p.trim());
    const setPart = detectProductChoice(parts[0] || "", "pitching");
    if (setPart) session.selectedProduct = setPart;
    if (parts[1] && isValidCustomerName(parts[1])) {
      session.collectedName = parts[1];
      session.customerName = parts[1];
    }
    if (parts[2]) {
      const pinMatch = parts[2].match(/\b([1-8]\d{5})\b/);
      if (pinMatch) session.collectedPincode = pinMatch[1];
      const addrClean = parts[2]
        .replace(/[-,\s]*(pin\s*)?\b[1-8]\d{5}\b/gi, "")
        .trim();
      if (addrClean) session.collectedAddressLine = addrClean;
    }
    if (!session.selectedSize) {
      session.selectedSize = "FREE SIZE (Adjustable Tie)";
    }
  } else {
    // Normal human conversation extraction based on current stage
    if (detectedSetFromMsg && (session.stage === "pitching" || !session.selectedProduct)) {
      session.selectedProduct = detectedSetFromMsg;
      const inlineSize = detectSizeChoice(incomingText);
      if (inlineSize) {
        session.selectedSize = inlineSize;
        session.stage = "collecting_name";
      } else {
        session.stage = "collecting_size";
      }
    } else if (session.stage === "collecting_size") {
      // Allow switching set if they tapped another set button
      if (detectedSetFromMsg) {
        session.selectedProduct = detectedSetFromMsg;
      }
      const chosenSize = detectSizeChoice(incomingText, "collecting_size");
      if (chosenSize) {
        session.selectedSize = chosenSize;
        session.stage = "collecting_name";
      } else if (isValidCustomerName(incomingText)) {
        // Customer typed their name directly — default size to Free Size and accept their name!
        session.selectedSize = "FREE SIZE (Adjustable Tie)";
        const lines = incomingText
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        session.collectedName = lines[0];
        session.customerName = lines[0];
        if (lines.length > 1 && isValidAddressLine(lines.slice(1).join(", "))) {
          const rest = lines.slice(1).join(", ");
          const pinMatch = rest.match(/\b([1-8]\d{5})\b/);
          if (pinMatch) session.collectedPincode = pinMatch[1];
          session.collectedAddressLine = rest
            .replace(/[-,\s]*(pin\s*)?\b[1-8]\d{5}\b/gi, "")
            .trim();
          session.stage = session.collectedPincode
            ? "awaiting_payment"
            : "collecting_pincode";
        } else {
          session.stage = "collecting_address";
        }
      }
    } else if (session.stage === "collecting_name") {
      // Check if they sent Name + Address on multiple lines (like "Niyas\nkizhakkan house")
      const lines = incomingText
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      const firstLine = lines[0] || "";

      if (isValidCustomerName(firstLine)) {
        session.collectedName = firstLine;
        session.customerName = firstLine;

        if (lines.length > 1) {
          const restAddress = lines.slice(1).join(", ");
          const pinMatch = restAddress.match(/\b([1-8]\d{5})\b/);
          if (pinMatch) {
            session.collectedPincode = pinMatch[1];
          }
          const cleanAddr = restAddress
            .replace(/[-,\s]*(pin\s*)?\b[1-8]\d{5}\b/gi, "")
            .trim();
          if (isValidAddressLine(cleanAddr)) {
            session.collectedAddressLine = cleanAddr;
            session.stage = session.collectedPincode
              ? "awaiting_payment"
              : "collecting_pincode";
          } else {
            session.stage = "collecting_address";
          }
        } else {
          session.stage = "collecting_address";
        }
      }
    } else if (session.stage === "collecting_address") {
      const pinMatch = incomingText.match(/\b([1-8]\d{5})\b/);
      if (pinMatch) {
        session.collectedPincode = pinMatch[1];
      }
      const cleanAddr = incomingText
        .replace(/[-,\s]*(pin\s*)?\b[1-8]\d{5}\b/gi, "")
        .trim();

      if (isValidAddressLine(cleanAddr)) {
        session.collectedAddressLine = cleanAddr;
        session.stage = session.collectedPincode
          ? "awaiting_payment"
          : "collecting_pincode";
      }
    } else if (session.stage === "collecting_pincode") {
      const pinMatch = incomingText.match(/\b([1-8]\d{5})\b/);
      if (pinMatch) {
        session.collectedPincode = pinMatch[1];
        // If they also included extra address text with the PIN, append if address was short
        const extraText = incomingText
          .replace(/[-,\s]*(pin|pincode|code)?\s*\b[1-8]\d{5}\b/gi, "")
          .trim();
        if (
          extraText.length > 3 &&
          session.collectedAddressLine &&
          !session.collectedAddressLine
            .toLowerCase()
            .includes(extraText.toLowerCase())
        ) {
          session.collectedAddressLine = `${session.collectedAddressLine}, ${extraText}`;
        }
      }
    } else if (session.stage === "awaiting_payment") {
      // Allow updating PIN code if they send a 6-digit PIN
      const pinMatch = incomingText.match(/\b([1-8]\d{5})\b/);
      if (pinMatch) {
        session.collectedPincode = pinMatch[1];
      }
    }
  }

  // Now determine the exact next step by verifying our required checklist in order:
  // 1. selectedProduct -> 2. selectedSize -> 3. collectedName -> 4. collectedAddressLine -> 5. collectedPincode
  let aiReplyText = "";
  let createdOrder: OrderRecord | undefined;
  let paymentLink: string | undefined;
  let replyButtons: Array<{ id: string; title: string }> | undefined;
  let attachProductImages = false;

  const faqPrefix = buildShortFaqPrefix(incomingText);

  if (!session.selectedProduct) {
    // STEP 1: Ask which set + show product images & 3 tap buttons
    session.stage = "pitching";
    attachProductImages = !session.imagesSent;
    session.imagesSent = true;
    replyButtons = PRODUCT_BUTTONS;

    aiReplyText =
      `${faqPrefix}Hi! Welcome to *APOORVA SHELLS* 🐚\n\n` +
      `Here are our 2 handcrafted Kerala coconut shell beachwear sets:\n` +
      `1️⃣ *Set 01: Coir Fringe Set* — ₹${prod1.price.toLocaleString("en-IN")}\n` +
      `2️⃣ *Set 02: Jute Wrap Set* — ₹${prod2.price.toLocaleString("en-IN")}\n` +
      `🎁 *Both Sets Bundle* — ₹${bundlePrice.toLocaleString("en-IN")} (15% OFF)\n\n` +
      `Which set would you like? Tap below 👇`;
  } else if (!session.selectedSize) {
    // STEP 2: Ask which size/fit with 3 tap buttons
    session.stage = "collecting_size";
    replyButtons = SIZE_BUTTONS;
    const setLabel = getProductShortLabel(
      session.selectedProduct,
      prod1.price,
      prod2.price,
      bundlePrice
    );

    aiReplyText =
      `${faqPrefix}Lovely choice! ✨ I've selected *${setLabel}*.\n\n` +
      `Which fit would you like? Tap below 👇`;
  } else if (!session.collectedName) {
    // STEP 3: Ask ONLY for Full Name (or re-ask if invalid)
    const wasAlreadyAskingName = session.stage === "collecting_name";
    session.stage = "collecting_name";

    if (wasAlreadyAskingName && !detectSizeChoice(incomingText, "collecting_size")) {
      aiReplyText = `Could you please share your *Full Name* so we can put it on your delivery package? 😊`;
    } else {
      aiReplyText =
        `Perfect — *${session.selectedSize}* noted! 🙌\n\n` +
        `May I know your *Full Name* for the delivery parcel?`;
    }
  } else if (!session.collectedAddressLine) {
    // STEP 4: Ask ONLY for House / Street / City Delivery Address
    const wasAlreadyAskingAddress = session.stage === "collecting_address";
    session.stage = "collecting_address";

    if (wasAlreadyAskingAddress && !incomingText.includes(session.collectedName)) {
      aiReplyText =
        `Please share your *House/Flat Name, Street & City* so our courier can deliver right to your doorstep 📍`;
    } else {
      aiReplyText =
        `Thanks, *${session.collectedName}*! 🤍\n\n` +
        `What is your *House/Flat Name, Street & City* for delivery?`;
    }
  } else if (!session.collectedPincode) {
    // STEP 5: Ask ONLY for 6-digit PIN Code
    const wasAlreadyAskingPin = session.stage === "collecting_pincode";
    session.stage = "collecting_pincode";

    if (wasAlreadyAskingPin) {
      aiReplyText =
        `Please share a valid *6-digit PIN code* (for example: *683101*) so I can verify delivery and send your payment link 🙏`;
    } else {
      aiReplyText =
        `Got your address (*${session.collectedAddressLine}*)! 📍\n\n` +
        `What is your *6-digit PIN code*?`;
    }
  } else {
    // STEP 6: All 5 details verified! Create Order & Send Direct Payment Link!
    createdOrder = createOrderForChatSession(db, session);
    paymentLink = buildPaymentUrlForOrder(createdOrder);
    session.orderId = createdOrder.orderId;
    session.paymentLink = paymentLink;
    session.stage = "awaiting_payment";

    const itemSummary = createdOrder.items
      .map((i) => `${i.name} (${i.size})`)
      .join(" + ");

    aiReplyText =
      `🎉 All set, *${createdOrder.customer.fullName}*! Your *APOORVA SHELLS* order is reserved:\n\n` +
      `🛍️ *Set:* ${itemSummary}\n` +
      `💰 *Total:* ₹${createdOrder.pricing.total.toLocaleString("en-IN")} (Free Air Shipping)\n` +
      `📍 *Deliver to:* ${createdOrder.customer.addressLine1}, ${createdOrder.customer.city} - ${createdOrder.customer.pincode}\n` +
      `📦 *Order ID:* #${createdOrder.orderId}\n\n` +
      `💳 *Tap below to complete your payment (UPI / GPay / Cards):*\n` +
      `${paymentLink}`;
  }

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
    // 1. If showing catalog for the first time, send the 2 product photos first!
    if (productImagesList && productImagesList.length > 0) {
      for (const img of productImagesList) {
        await sendWhatsAppImageMessage({
          to: session.customerHandleOrPhone,
          imageUrl: img.url,
          caption: img.caption
        });
      }
    }

    // 2. If step has interactive buttons (Set choice or Size choice), send interactive buttons!
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
      body: aiReplyText
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
      `🌴 Hi *${session.customerName}*! Here is your direct 1-Click Razorpay Payment Link for Order *#${createdOrder.orderId}* (${itemSummary} • *₹${createdOrder.pricing.total.toLocaleString("en-IN")}* Free Express Shipping):\n\n💳 Tap to pay securely:\n${paymentLink}`;
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
