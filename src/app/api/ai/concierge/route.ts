import { NextResponse } from "next/server";
import { ensureStoreDatabaseLoaded } from "@/lib/store/adminStore";
import { generateGeminiReply, type GeminiMessage } from "@/lib/ai/gemini";
import { processIncomingSalesChat } from "@/lib/ai/salesAgent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message = "Explain APOORVA's handcrafted beachwear sets and sizing",
      history = [],
      mode = "concierge",
      sessionId,
      visitorName,
      visitorHandle
    } = body as {
      message?: string;
      history?: GeminiMessage[];
      mode?: "concierge" | "admin_copywriter";
      sessionId?: string;
      visitorName?: string;
      visitorHandle?: string;
    };

    const db = await ensureStoreDatabaseLoaded();

    if (mode === "admin_copywriter") {
      const catalogSummary = db.products
        .map(
          (p) =>
            `- Set ${p.number}: ${p.name} (${p.shortName}) | Price: ₹${p.price} (MRP ₹${p.originalPrice || p.price}) | Material: ${p.material} | Fit: ${p.fit} | Description: ${p.description}`
        )
        .join("\n");

      const result = await generateGeminiReply({
        prompt: message,
        systemInstruction: `You are the Creative Director at APOORVA Atelier in Aluva, Kerala. Write punchy, editorial, luxury tropical beachwear copy grounded in authentic Kerala craftsmanship (virgin coconut oil polished shells, breathable cotton cup lining, combed tender coir fringe, fine-weave jute wrap skirts). Current catalog:\n${catalogSummary}`,
        history: Array.isArray(history) ? history.slice(-6) : []
      });

      return NextResponse.json({
        success: true,
        reply: result.text,
        model: result.model,
        fromFallback: result.fromFallback,
        projectId: "apoorva-89bc7"
      });
    }

    // Route website shopper chat through the Omnichannel AI Sales Agent
    // so it convinces, collects delivery address + PIN code, generates a 1-Click Razorpay payment link,
    // AND syncs live with the Admin Panel Chat Inbox!
    const salesResult = await processIncomingSalesChat({
      channel: "website",
      customerHandleOrPhone: visitorHandle || sessionId || "web-visitor",
      customerName: visitorName || "Website Shopper",
      messageText: message,
      sessionId
    });

    return NextResponse.json({
      success: true,
      reply:
        salesResult.aiReply ||
        "Thank you! Our team has received your message and will reply right here in a moment.",
      session: salesResult.session,
      paymentLink: salesResult.paymentLink,
      order: salesResult.order,
      model: "gemini-flash-latest",
      projectId: "apoorva-89bc7"
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "AI Concierge request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (sessionId) {
    const db = await ensureStoreDatabaseLoaded();
    const session = (db.chatSessions || []).find((s) => s.id === sessionId);
    return NextResponse.json({
      status: "active",
      session: session || null
    });
  }

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
