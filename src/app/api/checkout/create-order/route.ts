import { NextResponse } from "next/server";
import { PRODUCTS } from "@/data/products";
import { ensureStoreDatabaseLoaded } from "@/lib/store/adminStore";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/payment/razorpay";
import { CustomerDetails } from "@/lib/types/checkout";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, customer, appliedDiscount = 0 } = body as {
      items: Array<{ productId: string; size: string; quantity: number }>;
      customer?: CustomerDetails;
      appliedDiscount?: number;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. Please add items before checking out." },
        { status: 400 }
      );
    }

    // Verify items and prices server-side from live Admin Store in MongoDB
    const storeDb = await ensureStoreDatabaseLoaded();
    const activeCatalog = storeDb.products?.length ? storeDb.products : PRODUCTS;
    let rawSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prod = activeCatalog.find((p) => p.id === item.productId) || activeCatalog[0];
      const lineTotal = prod.price * item.quantity;
      rawSubtotal += lineTotal;
      validatedItems.push({
        id: `${prod.id}-${item.size}`,
        productId: prod.id,
        name: prod.name,
        subName: prod.subName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: prod.price,
        totalPrice: lineTotal,
        image: prod.image,
        color: prod.color
      });
    }

    const discountPercentage = appliedDiscount > 0 ? appliedDiscount : 0;
    const discountAmount = Math.round((rawSubtotal * discountPercentage) / 100);
    const subtotal = Math.max(0, rawSubtotal - discountAmount);
    const freeShippingThreshold = 4000;
    const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 250;
    const total = subtotal + shippingFee;

    const receipt = `APV_${Date.now().toString().slice(-6)}`;

    const razorpayOrder = await createRazorpayOrder({
      amountInRupees: total,
      receipt,
      notes: {
        customerName: customer?.fullName || "Valued Client",
        customerEmail: customer?.email || "customer@example.com",
        receipt
      }
    });

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.orderId,
      receipt,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency,
      keyId: razorpayOrder.keyId,
      isSandbox: razorpayOrder.isSandbox,
      isLiveConfigured: isRazorpayConfigured(),
      pricing: {
        rawSubtotal,
        discountPercentage,
        discountAmount,
        subtotal,
        shippingFee,
        total,
        currency: "INR"
      },
      items: validatedItems
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate Razorpay order";
    console.error("[Create Order Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
