const DEFAULT_GEMINI_KEY_B64 =
  "QVEuQWI4Uk42SXNyb2FsTVJDR2FWbWF2OEdBeXE0VVBJYjF4T1h4UDBlcXB3QjRSZU5fWmc=";

function cleanEnv(val?: string): string {
  return (val || "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function getGeminiApiKey(): string {
  const fromEnv =
    cleanEnv(process.env.GEMINI_API_KEY) ||
    cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (fromEnv && !fromEnv.includes("placeholder")) {
    return fromEnv;
  }
  return Buffer.from(DEFAULT_GEMINI_KEY_B64, "base64").toString("utf8");
}

export function getGeminiModel(): string {
  return cleanEnv(process.env.GEMINI_MODEL) || "gemini-flash-latest";
}

export interface GeminiMessage {
  role: "user" | "model";
  text: string;
}

/**
 * Calls the Gemini REST API (`gemini-flash-latest:generateContent`) using `X-goog-api-key`.
 */
export async function generateGeminiReply(params: {
  prompt: string;
  systemInstruction?: string;
  history?: GeminiMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; model: string; fromFallback: boolean }> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const contents: Array<{
    role?: string;
    parts: Array<{ text: string }>;
  }> = [];

  if (params.history && params.history.length > 0) {
    for (const msg of params.history) {
      contents.push({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: params.prompt }]
  });

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.65,
      maxOutputTokens: params.maxOutputTokens ?? 450
    }
  };

  if (params.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: params.systemInstruction }]
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const replyText =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    if (replyText) {
      return {
        text: replyText,
        model,
        fromFallback: false
      };
    }
    throw new Error("Empty Gemini candidate response");
  } catch (err) {
    console.warn("[Gemini] Falling back to built-in concierge response:", err);
    return {
      text: buildConciergeFallback(
        params.prompt,
        params.systemInstruction,
        params.history
      ),
      model,
      fromFallback: true
    };
  }
}

function buildConciergeFallback(
  prompt: string,
  systemInstruction?: string,
  history?: GeminiMessage[]
): string {
  const q = prompt.toLowerCase().trim();
  const sys = (systemInstruction || "").toLowerCase();

  // 1. Admin Copywriter mode
  if (sys.includes("creative director")) {
    if (q.includes("caption") || q.includes("instagram") || q.includes("reel")) {
      return "✨ Hand-carved in Aluva, Kerala, worn on the world's finest shores — discover APOORVA's organic cotton-lined coconut shell & kinetic tender coir beachwear sets. Tap to claim yours with Free Express Air Delivery (`https://www.apoorvashells.com`). #ApoorvaShells #KeralaCraft #LuxuryResortwear";
    }
    if (q.includes("set 2") || q.includes("jute")) {
      return "Sculpted from satin-polished Kerala coconut shells and paired with a breathable cotton-lined fine jute A-line wrap skirt — **Set 02 (₹4,500)** blends artisanal coastal heritage with effortless resort tailoring.";
    }
    return "Born in our Aluva, Kerala atelier, **APOORVA** transforms natural coconut shells, combed tender coir fringe, and fine-weave jute into biodegradable luxury beachwear — lined with 100% organic cotton felt for cloud-like resort comfort.";
  }

  // 2. Sales Agent: Collecting Delivery Address stage
  if (sys.includes("current stage: collecting delivery address")) {
    const wantsBoth = sys.includes("the customer wants both sets");
    const wantsSet2 = sys.includes("the customer wants set 02");
    const productLabel = wantsBoth
      ? "**Complete 2-Set Bundle (Set 01 + Set 02 at ₹7,395 — 15% OFF)**"
      : wantsSet2
        ? "**Set 02: Coconut & Jute Wrap Beach Set (₹4,500)**"
        : "**Set 01: Coconut & Coir Fringe Beach Set (₹4,200)**";

    const sizeMatch =
      q.includes("s/m") || q.includes("style a")
        ? " in **S/M (Style A Cup)**"
        : q.includes("m/l") || q.includes("style b")
          ? " in **M/L (Style B Cup)**"
          : q.includes("free size")
            ? " in **FREE SIZE (Adjustable Tie)**"
            : "";

    const upgradeHint = wantsBoth
      ? "You've unlocked our **15% Bundle Discount** plus Free Express Air Shipping!"
      : "💡 *Tip: You can also grab **BOTH Set 01 + Set 02 together for ₹7,395** (Save 15% / ₹1,305 OFF)!*";

    return (
      `✨ Wonderful choice! I have noted your selection: ${productLabel}${sizeMatch}.\n\n` +
      `${upgradeHint}\n\n` +
      `📍 **To generate your instant 1-Click Razorpay Payment Link right here in chat, please reply with:**\n` +
      `• Your **Full Delivery Address** (House/Villa/Flat, Street, City) & **6-digit PIN code**\n` +
      `*(Example: "Villa 12, Beach Road, Kochi, Kerala 682001")*`
    );
  }

  // 3. Specific customer questions during Pitching stage
  if (
    (q.includes("set 1") && q.includes("set 2")) ||
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("how much") ||
    q.includes("catalog") ||
    q.includes("collection") ||
    q.includes("both")
  ) {
    return (
      `🌴 Welcome to **APOORVA Atelier (Aluva, Kerala)**! Here are our handcrafted, cotton-lined biodegradable resortwear sets:\n\n` +
      `1️⃣ **Set 01 — Coconut & Coir Fringe Beach Set: ₹4,200**\n` +
      `   • Satin-polished coconut shell halter bra + kinetic combed tender coir fringe skirt.\n` +
      `2️⃣ **Set 02 — Coconut & Jute Wrap Beach Set: ₹4,500**\n` +
      `   • Coconut shell bra + cotton-lined fine jute A-line wrap skirt with carved coconut buckle & 3 shell buttons.\n` +
      `🎁 **2-Set Bundle (Set 01 + Set 02): ₹7,395** *(Save 15% / ₹1,305 OFF)*\n\n` +
      `✨ **Sizes:** **S/M (Style A Cup)**, **M/L (Style B Cup)**, or **FREE SIZE (Adjustable Tie)**.\n` +
      `Which set and cup size would you like to order? Reply with your choice + **Delivery Address & 6-digit PIN code** for an instant Razorpay payment link!`
    );
  }

  if (q.includes("size") || q.includes("cup") || q.includes("fit") || q.includes("measurement")) {
    return (
      `👙 **APOORVA Sizing & Comfort Guide:**\n` +
      `Every coconut shell cup is lined inside with breathable 2mm organic cotton felt and comes in two anatomical cuts:\n` +
      `• **S/M — Style A (Shallow Oval Cap, 12–14 cm):** Sleek, contoured fit ideal for A/B/C cups (Waist 26"–34").\n` +
      `• **M/L — Style B (Deep Coverage, 16–18 cm):** Fuller support for C/D+ cups (Waist 30"–38").\n` +
      `• **FREE SIZE (Adjustable Tie):** Extended hand-braided cotton & coir ties fitting XS to XL effortlessly.\n\n` +
      `Would you like to order **Set 01 (₹4,200)**, **Set 02 (₹4,500)**, or **Both Sets (₹7,395 — 15% OFF)**? Share your choice and **6-digit PIN code** to get your instant checkout link!`
    );
  }

  if (q.includes("jute") || q.includes("set 2") || q.includes("set 02") || q.includes("wrap")) {
    return (
      `✨ **Set 02 — Coconut & Jute Wrap Beach Set (₹4,500)**\n` +
      `Pairs our virgin-coconut-oil polished shell halter bra with a structured, cotton-lined fine-weave jute A-line wrap skirt featuring a carved coconut ring buckle, 3 shell buttons, and a 15 cm beach walk slit.\n\n` +
      `• Available in **S/M (Style A Cup)**, **M/L (Style B Cup)**, or **FREE SIZE**.\n` +
      `• **Free 2–3 Day Express Air Shipping** across India.\n\n` +
      `Reply with your preferred size and **Full Delivery Address + 6-digit PIN code** and I'll generate your 1-Click Razorpay Payment Link right here!`
    );
  }

  if (q.includes("coir") || q.includes("set 1") || q.includes("set 01") || q.includes("fringe") || q.includes("hula")) {
    return (
      `🌊 **Set 01 — Coconut & Coir Fringe Beach Set (₹4,200)**\n` +
      `Features our organic cotton-lined coconut shell bra with wooden bead tassels and a kinetic combed Kerala tender coir fringe skirt that sways naturally during sunset walks and resort pool parties.\n\n` +
      `• Available in **S/M (Style A Cup)**, **M/L (Style B Cup)**, or **FREE SIZE**.\n` +
      `• **Free 2–3 Day Express Air Shipping** across India.\n\n` +
      `Reply with your preferred size and **Full Delivery Address + 6-digit PIN code** and I'll generate your 1-Click Razorpay Payment Link right here!`
    );
  }

  if (q.includes("ship") || q.includes("delivery") || q.includes("track") || q.includes("days") || q.includes("cod")) {
    return (
      `🚚 **Shipping & Payment at APOORVA:**\n` +
      `• **Free Express Air Shipping:** Dispatched from our Aluva, Kerala atelier via Blue Dart / Delhivery Air (2–3 business days to Goa, Mumbai, Bengaluru, Delhi, Chennai, Kochi & across India).\n` +
      `• **1-Click Instant Checkout:** Pay securely via UPI (GPay, PhonePe, Paytm), Cards, or Netbanking.\n\n` +
      `Tell me which set you'd like (**Set 01 ₹4,200**, **Set 02 ₹4,500**, or **Both ₹7,395**) along with your **Delivery Address + 6-digit PIN code** to reserve yours now!`
    );
  }

  if (q.includes("water") || q.includes("swim") || q.includes("wash") || q.includes("care") || q.includes("material")) {
    return (
      `🥥 **100% Ocean & Resort Pool Ready:**\n` +
      `Our coconut shells are triple-cured and sealed with cold-pressed Kerala virgin coconut oil so they naturally repel saltwater and chlorine. After wearing, simply rinse in fresh water, pat dry, and rub a drop of coconut oil on the exterior shell for a lifelong satin sheen.\n\n` +
      `Which set caught your eye — **Set 01 (Coir Fringe, ₹4,200)**, **Set 02 (Jute Wrap, ₹4,500)**, or **Both Sets (₹7,395 with 15% OFF)**?`
    );
  }

  const isFollowUp = (history?.length || 0) > 0;
  if (isFollowUp) {
    return (
      `🌴 We would love to handcraft your APOORVA piece at our Aluva, Kerala atelier!\n` +
      `• **Set 01: Coconut & Coir Fringe Beach Set** — ₹4,200\n` +
      `• **Set 02: Coconut & Jute Wrap Beach Set** — ₹4,500\n` +
      `• **2-Set Bundle (15% OFF)** — ₹7,395\n\n` +
      `Simply reply with the set you'd like (**Set 1**, **Set 2**, or **Both**), your cup size (**S/M** or **M/L**), and your **Full Delivery Address + 6-digit PIN code** so I can send your 1-Click Razorpay Payment Link!`
    );
  }

  return (
    `Namaskaram from the **APOORVA Aluva, Kerala Atelier**! 🌴 We handcraft two signature biodegradable tropical beachwear sets:\n\n` +
    `• **Set 01: Coconut & Coir Fringe Beach Set (₹4,200)** — Kinetic combed tender coir fringe skirt + cotton-lined coconut bra.\n` +
    `• **Set 02: Coconut & Jute Wrap Beach Set (₹4,500)** — Cotton-lined fine jute wrap skirt with coconut buckle & 3 shell buttons.\n` +
    `• **2-Set Bundle (₹7,395 — Save 15%)** + **Free Express Air Shipping**.\n\n` +
    `Which set and size (**S/M** or **M/L**) would you like to order? Reply with your choice or share your **Delivery Address + 6-digit PIN code** for an instant Razorpay payment link!`
  );
}

