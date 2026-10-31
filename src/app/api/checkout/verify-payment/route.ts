import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/payment/razorpay";
import {
  sendOrderConfirmationEmail,
  sendAdminOrderAlertEmail
} from "@/lib/email/emailService";
import { createShiprocketOrder } from "@/lib/shipping/shiprocket";
import {
  ensureStoreDatabaseLoaded,
  persistStoreDatabase,
  recordOrderInStore
} from "@/lib/store/adminStore";
import { OrderRecord, CustomerDetails, OrderItemSummary, OrderPricing } from "@/lib/types/checkout";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      items,
      pricing,
      paymentMethod = "upi",
      isSandbox = false
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      customer: CustomerDetails;
      items: OrderItemSummary[];
      pricing: OrderPricing;
      paymentMethod?: string;
      isSandbox?: boolean;
    };

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: "Missing required Razorpay payment parameters." },
        { status: 400 }
      );
    }

    // Verify cryptographic signature
    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed: invalid signature. Security alert logged." },
        { status: 400 }
      );
    }

    const orderId = `APV-${Math.floor(10000 + Math.random() * 90000)}`;

    // ⚡ ON BOOKING ITSELF: Create Order in Shiprocket & Auto-Assign AWB
    const shiprocketResult = await createShiprocketOrder({
      order_id: orderId,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Aluva Atelier",
      billing_customer_name: customer.fullName || "Valued Client",
      billing_address: customer.addressLine1,
      billing_address_2: customer.addressLine2 || "",
      billing_city: customer.city,
      billing_pincode: customer.pincode,
      billing_state: customer.state,
      billing_country: "India",
      billing_email: customer.email,
      billing_phone: customer.phone,
      shipping_is_billing: true,
      order_items: items.map((i) => ({
        name: i.name,
        sku: i.productId,
        units: i.quantity,
        selling_price: i.unitPrice
      })),
      payment_method: "Prepaid",
      sub_total: pricing.total,
      length: 22,
      breadth: 18,
      height: 12,
      weight: 0.65
    });

    const assignedAwb = shiprocketResult.awbCode || `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`;
    const courierPartner = shiprocketResult.courierName || "Blue Dart Express";

    const orderRecord: OrderRecord = {
      orderId,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: "paid",
      customer: {
        fullName: customer.fullName || "Valued Client",
        email: customer.email,
        phone: customer.phone,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        country: "India",
        orderNotes: customer.orderNotes
      },
      items,
      pricing,
      payment: {
        gateway: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        method: paymentMethod,
        isSandbox,
        paidAt: new Date().toISOString()
      },
      shipping: {
        courierName: courierPartner,
        trackingNumber: assignedAwb,
        trackingUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/track?orderId=${orderId}`,
        estimatedDelivery: "2-3 Business Days"
      }
    };

    // Persist order into Admin Store & MongoDB
    await ensureStoreDatabaseLoaded();
    recordOrderInStore(orderRecord);
    const currentDb = await ensureStoreDatabaseLoaded();
    await persistStoreDatabase(currentDb);

    // Trigger Email Notification System concurrently
    const [customerEmailResult, adminEmailResult] = await Promise.allSettled([
      sendOrderConfirmationEmail(orderRecord),
      sendAdminOrderAlertEmail(orderRecord)
    ]);

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order registered.",
      order: orderRecord,
      notifications: {
        customerEmail:
          customerEmailResult.status === "fulfilled"
            ? customerEmailResult.value
            : { success: false, error: "Failed to send customer email" },
        adminEmail:
          adminEmailResult.status === "fulfilled"
            ? adminEmailResult.value
            : { success: false, error: "Failed to send admin alert" }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment verification error";
    console.error("[Verify Payment Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
