import { NextResponse } from "next/server";
import { sendShippingDispatchEmail } from "@/lib/email/emailService";
import { OrderRecord } from "@/lib/types/checkout";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order,
      trackingNumber = `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
      courierName = "Blue Dart Express",
      trackingUrl = "https://www.bluedart.com"
    } = body as {
      order: OrderRecord;
      trackingNumber?: string;
      courierName?: string;
      trackingUrl?: string;
    };

    if (!order || !order.customer?.email) {
      return NextResponse.json(
        { error: "Order details and customer email required." },
        { status: 400 }
      );
    }

    const updatedOrder: OrderRecord = {
      ...order,
      status: "dispatched",
      shipping: {
        courierName,
        trackingNumber,
        trackingUrl,
        estimatedDelivery: "2-3 Business Days",
        dispatchedAt: new Date().toISOString()
      }
    };

    const result = await sendShippingDispatchEmail({
      order: updatedOrder,
      trackingNumber,
      courierName,
      trackingUrl
    });

    return NextResponse.json({
      success: true,
      message: `Shipping dispatch email successfully sent to ${order.customer.email}`,
      order: updatedOrder,
      result
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to trigger dispatch notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
