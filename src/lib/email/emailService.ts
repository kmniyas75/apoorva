import { Resend } from "resend";
import { OrderRecord, EmailNotificationLog } from "@/lib/types/checkout";
import { generateOrderConfirmationHtml } from "./templates/orderConfirmation";
import { generateAdminAlertHtml } from "./templates/adminAlert";
import { generateShippingDispatchHtml } from "./templates/shippingDispatch";
import { generatePaymentFailedHtml } from "./templates/paymentFailed";

// In-memory notification log buffer for preview and verification attached to globalThis
const globalLogs = (globalThis as unknown as { __APOORVA_EMAIL_LOGS__?: EmailNotificationLog[] });
if (!globalLogs.__APOORVA_EMAIL_LOGS__) {
  globalLogs.__APOORVA_EMAIL_LOGS__ = [];
}
const notificationLogs = globalLogs.__APOORVA_EMAIL_LOGS__;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (
    !apiKey ||
    !apiKey.startsWith("re_") ||
    apiKey.includes("placeholder") ||
    apiKey.startsWith("re_E1hQg3Ja")
  ) {
    return null;
  }
  return new Resend(apiKey);
}

function getSenderEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "APOORVA Atelier <onboarding@resend.dev>";
}

function getAdminEmail(): string {
  return (
    process.env.ADMIN_ORDER_NOTIFY_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    "concierge@apoorva.luxury"
  );
}

function recordLog(log: EmailNotificationLog) {
  notificationLogs.unshift(log);
  if (notificationLogs.length > 50) {
    notificationLogs.pop();
  }
}

export function getEmailLogs(): EmailNotificationLog[] {
  return [...notificationLogs];
}

/**
 * 1. Customer Order Confirmation & Receipt Email
 */
export async function sendOrderConfirmationEmail(order: OrderRecord): Promise<{
  success: boolean;
  mode: "resend" | "simulated";
  messageId?: string;
  error?: string;
}> {
  const recipient = order.customer.email;
  const subject = `Archival Acquisition Confirmed #${order.orderId} — APOORVA Atelier`;
  const html = generateOrderConfirmationHtml(order);

  const resend = getResendClient();

  if (!resend) {
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    recordLog({
      id: logId,
      type: "order_confirmation",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    console.log(`[Email Service - Simulated] Order Confirmation sent to ${recipient} for #${order.orderId}`);
    return { success: true, mode: "simulated", messageId: logId };
  }

  try {
    const data = await resend.emails.send({
      from: getSenderEmail(),
      to: recipient,
      subject,
      html
    });

    const messageId = data?.data?.id || `resend-${Date.now()}`;
    recordLog({
      id: messageId,
      type: "order_confirmation",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "delivered",
      htmlContent: html,
      orderId: order.orderId,
      resendMessageId: data?.data?.id
    });

    return { success: true, mode: "resend", messageId: data?.data?.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Email Service - Resend Error]", errorMessage);
    // Graceful fallback to simulation log
    const fallbackId = `fallback-${Date.now()}`;
    recordLog({
      id: fallbackId,
      type: "order_confirmation",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: fallbackId, error: errorMessage };
  }
}

/**
 * 2. Admin New Order Alert Notification
 */
export async function sendAdminOrderAlertEmail(order: OrderRecord): Promise<{
  success: boolean;
  mode: "resend" | "simulated";
  messageId?: string;
}> {
  const recipient = getAdminEmail();
  const subject = `[ATELIER ALERT] New Order Received #${order.orderId} (₹${order.pricing.total.toLocaleString("en-IN")})`;
  const html = generateAdminAlertHtml(order);

  const resend = getResendClient();

  if (!resend) {
    const logId = `admin-log-${Date.now()}`;
    recordLog({
      id: logId,
      type: "admin_alert",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    console.log(`[Email Service - Simulated] Admin Alert logged for order #${order.orderId}`);
    return { success: true, mode: "simulated", messageId: logId };
  }

  try {
    const data = await resend.emails.send({
      from: getSenderEmail(),
      to: recipient,
      subject,
      html
    });

    recordLog({
      id: data?.data?.id || `admin-${Date.now()}`,
      type: "admin_alert",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "delivered",
      htmlContent: html,
      orderId: order.orderId,
      resendMessageId: data?.data?.id
    });

    return { success: true, mode: "resend", messageId: data?.data?.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("[Email Service - Admin Resend Warning]", errorMessage);
    const fallbackId = `admin-fallback-${Date.now()}`;
    recordLog({
      id: fallbackId,
      type: "admin_alert",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: fallbackId };
  }
}

/**
 * 3. Courier & Shipping Dispatch Tracking Notification
 */
export async function sendShippingDispatchEmail(params: {
  order: OrderRecord;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
}): Promise<{
  success: boolean;
  mode: "resend" | "simulated";
  messageId?: string;
}> {
  const { order, trackingNumber = "BD-88492019IN", courierName = "Blue Dart Express", trackingUrl = "https://www.bluedart.com" } = params;
  const recipient = order.customer.email;
  const subject = `Your Archive Has Dispatched #${order.orderId} — Tracking ${trackingNumber}`;
  const html = generateShippingDispatchHtml(order, trackingNumber, courierName, trackingUrl);

  const resend = getResendClient();

  if (!resend) {
    const logId = `dispatch-log-${Date.now()}`;
    recordLog({
      id: logId,
      type: "shipping_dispatch",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: logId };
  }

  try {
    const data = await resend.emails.send({
      from: getSenderEmail(),
      to: recipient,
      subject,
      html
    });

    recordLog({
      id: data?.data?.id || `disp-${Date.now()}`,
      type: "shipping_dispatch",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "delivered",
      htmlContent: html,
      orderId: order.orderId,
      resendMessageId: data?.data?.id
    });

    return { success: true, mode: "resend", messageId: data?.data?.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("[Email Service - Dispatch Resend Warning]", errorMessage);
    const fallbackId = `dispatch-fallback-${Date.now()}`;
    recordLog({
      id: fallbackId,
      type: "shipping_dispatch",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: fallbackId };
  }
}

/**
 * 4. Payment Failed / Abandoned Checkout Alert
 */
export async function sendPaymentFailedEmail(params: {
  order: OrderRecord;
  failureReason?: string;
  retryCheckoutUrl?: string;
}): Promise<{
  success: boolean;
  mode: "resend" | "simulated";
  messageId?: string;
}> {
  const { order, failureReason = "Payment session was cancelled or timed out", retryCheckoutUrl } = params;
  const recipient = order.customer.email;
  const subject = `Artisanal Reservation Held: Order #${order.orderId} Payment Incomplete`;
  const html = generatePaymentFailedHtml(order, failureReason, retryCheckoutUrl);

  const resend = getResendClient();

  if (!resend) {
    const logId = `failed-log-${Date.now()}`;
    recordLog({
      id: logId,
      type: "payment_failed",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: logId };
  }

  try {
    const data = await resend.emails.send({
      from: getSenderEmail(),
      to: recipient,
      subject,
      html
    });

    recordLog({
      id: data?.data?.id || `fail-${Date.now()}`,
      type: "payment_failed",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "delivered",
      htmlContent: html,
      orderId: order.orderId,
      resendMessageId: data?.data?.id
    });

    return { success: true, mode: "resend", messageId: data?.data?.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("[Email Service - Failed Alert Resend Warning]", errorMessage);
    const fallbackId = `failed-fallback-${Date.now()}`;
    recordLog({
      id: fallbackId,
      type: "payment_failed",
      recipient,
      subject,
      sentAt: new Date().toISOString(),
      status: "simulated",
      htmlContent: html,
      orderId: order.orderId
    });
    return { success: true, mode: "simulated", messageId: fallbackId };
  }
}
