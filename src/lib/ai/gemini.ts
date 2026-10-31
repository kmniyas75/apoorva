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
      text: buildConciergeFallback(params.prompt),
      model,
      fromFallback: true
    };
  }
}

function buildConciergeFallback(prompt: string): string {
  const q = prompt.toLowerCase();
  if (q.includes("size") || q.includes("cup") || q.includes("fit")) {
    return "At our Aluva, Kerala atelier, every APOORVA coconut bra is lined with breathable organic cotton felt and comes in two anatomical cuts: **Style A (Shallow Oval Cap, 12–14 cm)** for a sleek, natural contour on A/B/C cups, and **Style B (Deep Coverage, 16–18 cm)** for fuller C/D+ support. Both feature adjustable hand-braided ties that fit XS to XL effortlessly.";
  }
  if (q.includes("jute") || q.includes("set 2") || q.includes("wrap")) {
    return "**Set 02 — Coconut & Jute Wrap Beach Set (₹4,500)** pairs our satin-polished coconut shell halter bra with a structured, cotton-lined fine-weave jute A-line wrap skirt featuring a carved coconut ring buckle, 3 shell buttons, and a breezy 15 cm beach walk slit.";
  }
  if (q.includes("coir") || q.includes("set 1") || q.includes("fringe") || q.includes("hula")) {
    return "**Set 01 — Coconut & Coir Fringe Beach Set (₹4,200)** features our signature cotton-lined coconut shell bra with wooden bead tassels and a kinetic combed Kerala tender coir fringe skirt that sways effortlessly during sunset walks and beach bonfire parties.";
  }
  if (q.includes("ship") || q.includes("delivery") || q.includes("track")) {
    return "All APOORVA orders ship with **Free Express Air Delivery** across India via Blue Dart / Delhivery in discreet luxury resort gift packaging (2–3 business days).";
  }
  return "Namaskaram from the **APOORVA Aluva, Kerala Atelier**! We handcraft two signature biodegradable tropical beachwear sets:\n• **Set 01: Coconut & Coir Fringe Beach Set (₹4,200)** — Kinetic combed tender coir fringe skirt + cotton-lined coconut bra.\n• **Set 02: Coconut & Jute Wrap Beach Set (₹4,500)** — Cotton-lined fine jute wrap skirt with coconut buckle & 3 shell buttons.\n\nOrder both sets together for an instant **15% Bundle Discount** and Free Express Shipping!";
}
