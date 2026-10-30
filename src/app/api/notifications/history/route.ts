import { NextResponse } from "next/server";
import {
  getEmailLogs,
  sendOrderConfirmationEmail,
  sendAdminOrderAlertEmail,
  sendShippingDispatchEmail,
  sendPaymentFailedEmail
} from "@/lib/email/emailService";
import { OrderRecord } from "@/lib/types/checkout";
import { PRODUCTS } from "@/data/products";

export async function GET() {
  const logs = getEmailLogs();
  return NextResponse.json({
    logs,
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY &&
        process.env.RESEND_API_KEY !== "re_test_placeholder"
    ),
    fromEmail: process.env.RESEND_FROM_EMAIL || "APOORVA Atelier <onboarding@resend.dev>",
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || "concierge@apoorva.luxury"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, recipientEmail } = body as {
      type: "order_confirmation" | "admin_alert" | "shipping_dispatch" | "payment_failed";
      recipientEmail?: string;
    };

    const sampleOrder: OrderRecord = {
      orderId: `APV-${Math.floor(10000 + Math.random() * 90000)}`,
      receiptNumber: `RCP-TEST-99`,
      createdAt: new Date().toISOString(),
      status: "paid",
      customer: {
        fullName: "Ananya Sharma",
        email: recipientEmail || "client@apoorva.luxury",
        phone: "+91 98401 23456",
        addressLine1: "Penthouse 14B, Palm Grove Residencies",
        addressLine2: "Off Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400020",
        country: "India",
        orderNotes: "Gift wrapping in artisanal cedar box requested."
      },
      items: [
        {
          id: "apv-sample-1",
          productId: PRODUCTS[0].id,
          name: PRODUCTS[0].name,
          subName: PRODUCTS[0].subName,
          size: "M/L",
          quantity: 1,
          unitPrice: PRODUCTS[0].price,
          totalPrice: PRODUCTS[0].price,
          image: PRODUCTS[0].image,
          color: PRODUCTS[0].color
        }
      ],
      pricing: {
        rawSubtotal: PRODUCTS[0].price,
        discountPercentage: 15,
        discountAmount: Math.round((PRODUCTS[0].price * 15) / 100),
        subtotal: PRODUCTS[0].price - Math.round((PRODUCTS[0].price * 15) / 100),
        shippingFee: 0,
        total: PRODUCTS[0].price - Math.round((PRODUCTS[0].price * 15) / 100),
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: `order_sample_${Date.now()}`,
        razorpayPaymentId: `pay_sample_${Math.random().toString(36).slice(2, 9)}`,
        razorpaySignature: "sig_sample_verified",
        method: "upi",
        isSandbox: true,
        paidAt: new Date().toISOString()
      },
      shipping: {
        courierName: "Blue Dart Express",
        trackingNumber: "BD-88492019IN",
        trackingUrl: "https://www.bluedart.com",
        estimatedDelivery: "2-3 Business Days"
      }
    };

    let result;
    if (type === "order_confirmation") {
      result = await sendOrderConfirmationEmail(sampleOrder);
    } else if (type === "admin_alert") {
      result = await sendAdminOrderAlertEmail(sampleOrder);
    } else if (type === "shipping_dispatch") {
      result = await sendShippingDispatchEmail({
        order: sampleOrder,
        trackingNumber: "BD-99410294IN",
        courierName: "Blue Dart Express"
      });
    } else if (type === "payment_failed") {
      result = await sendPaymentFailedEmail({
        order: sampleOrder,
        failureReason: "Card issuing bank 3D Secure verification timed out"
      });
    } else {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email (${type}) triggered.`,
      result,
      sampleOrder
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
