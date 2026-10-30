import { NextResponse } from "next/server";
import { sendPaymentFailedEmail } from "@/lib/email/emailService";
import { OrderRecord } from "@/lib/types/checkout";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order, reason } = body as { order: OrderRecord; reason?: string };

    if (!order || !order.customer?.email) {
      return NextResponse.json(
        { error: "Order details and customer email required." },
        { status: 400 }
      );
    }

    const result = await sendPaymentFailedEmail({
      order,
      failureReason: reason || "User cancelled payment or banking session timed out",
      retryCheckoutUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}?retryOrder=${order.orderId}`
    });

    return NextResponse.json({
      success: true,
      message: "Payment failure recovery notification triggered.",
      result
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment failure reporting error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
