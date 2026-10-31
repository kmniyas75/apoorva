import { NextResponse } from "next/server";
import { ensureStoreDatabaseLoaded } from "@/lib/store/adminStore";
import { generateGeminiReply, type GeminiMessage } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message = "Explain APOORVA's handcrafted beachwear sets and sizing",
      history = [],
      mode = "concierge"
    } = body as {
      message?: string;
      history?: GeminiMessage[];
      mode?: "concierge" | "admin_copywriter";
    };

    const db = await ensureStoreDatabaseLoaded();
    const catalogSummary = db.products
      .map(
        (p) =>
          `- Set ${p.number}: ${p.name} (${p.shortName}) | Price: ₹${p.price} (MRP ₹${p.originalPrice || p.price}) | Material: ${p.material} | Fit: ${p.fit} | Description: ${p.description}`
      )
      .join("\n");

    const systemInstruction =
      mode === "admin_copywriter"
        ? `You are the Creative Director at APOORVA Atelier in Aluva, Kerala. Write punchy, editorial, luxury tropical beachwear copy grounded in authentic Kerala craftsmanship (virgin coconut oil polished shells, breathable cotton cup lining, combed tender coir fringe, fine-weave jute wrap skirts). Current catalog:\n${catalogSummary}`
        : `You are the APOORVA AI Coastal Stylist & Fit Concierge for APOORVA™ (apoorva-eight.vercel.app), a luxury handcrafted tropical beachwear atelier based in Aluva, Kerala, India.
Key Facts:
${catalogSummary}
- Bundle Offer: ${db.settings.bundleDiscountPercent || 15}% OFF when buying both Set 01 & Set 02 together.
- Cup Contour Styles:
  1) Style A (Shallow Oval Cap, 12-14 cm, 2.5-3.5 cm depth): Cut from the flattest side of large Kerala coconuts ("cut a cap, don't split in half") so it hugs the bust naturally without sticking out. Best for A/B/C cups.
  2) Style B (Deep Coverage, 16-18 cm, 6-7 cm depth): Full equatorial half-shell cut for fuller C/D+ support during waves and beach dancing.
- Comfort: Every coconut cup interior is padded with soft breathable organic cotton felt; skirts have adjustable braided waist ties (fit XS to XL).
- Shipping: Free Express Delivery across India (2-3 business days via Blue Dart / Delhivery) in gift-ready resort packaging.
Keep answers warm, concise (2-4 short sentences or bullet points), and helpful.`;

    const result = await generateGeminiReply({
      prompt: message,
      systemInstruction,
      history: Array.isArray(history) ? history.slice(-6) : []
    });

    return NextResponse.json({
      success: true,
      reply: result.text,
      model: result.model,
      fromFallback: result.fromFallback,
      projectId: "apoorva-89bc7"
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI Concierge request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const result = await generateGeminiReply({
    prompt: "Introduce APOORVA Kerala coastal beachwear in one short sentence."
  });
  return NextResponse.json({
    status: "active",
    firebaseProjectId: "apoorva-89bc7",
    geminiModel: result.model,
    fromFallback: result.fromFallback,
    sampleGreeting: result.text
  });
}
