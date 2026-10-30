import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes("placeholder")) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret
  });
}

export function isRazorpayConfigured(): boolean {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(key_id && key_secret && !key_id.includes("placeholder"));
}

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  isSandbox: boolean;
}> {
  const amountInPaise = Math.round(params.amountInRupees * 100);
  const client = getRazorpayClient();

  if (!client) {
    // Elegant sandbox / test mode order
    const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_apoorva_sandbox",
      isSandbox: true
    };
  }

  const order = await client.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes || {}
  });

  return {
    orderId: order.id,
    amount: typeof order.amount === "number" ? order.amount : amountInPaise,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || "",
    isSandbox: false
  };
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;

  // If mock/sandbox order
  if (orderId.startsWith("order_sim_") || signature.startsWith("sig_sim_")) {
    return true;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}
