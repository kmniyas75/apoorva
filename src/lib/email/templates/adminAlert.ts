import { OrderRecord } from "@/lib/types/checkout";

export function generateAdminAlertHtml(order: OrderRecord): string {
  const { customer, items, pricing, orderId, payment } = order;

  const itemsList = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #333333;">
        <td style="padding: 10px 0; color: #ffffff; font-family: monospace; font-size: 13px;">
          <strong>${item.name}</strong><br>
          <span style="color: #999999; font-size: 11px;">Size: ${item.size} &bull; Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 10px 0; text-align: right; color: #ffffff; font-family: monospace; font-size: 13px;">
          ₹${item.totalPrice.toLocaleString("en-IN")}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>[ADMIN ALERT] New Order Received #${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0c0c; font-family: -apple-system, BlinkMacSystemFont, monospace, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 6px; overflow: hidden;" cellpadding="0" cellspacing="0">
          
          <!-- Banner -->
          <tr>
            <td style="background-color: #2e1065; padding: 20px 28px; border-bottom: 2px solid #a855f7;">
              <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d8b4fe;">
                ATELIER OPERATIONS DISPATCH
              </span>
              <h1 style="font-family: monospace; font-size: 20px; margin: 6px 0 0 0; color: #ffffff;">
                ⚡ NEW ORDER #${orderId}
              </h1>
            </td>
          </tr>

          <!-- Key Metrics -->
          <tr>
            <td style="padding: 24px 28px; background-color: #222222; border-bottom: 1px solid #333333;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50%;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase;">Total Collected</div>
                    <div style="font-size: 24px; font-weight: bold; color: #4ade80; margin-top: 4px;">
                      ₹${pricing.total.toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase;">Payment Gateway</div>
                    <div style="font-size: 13px; font-weight: bold; color: #60a5fa; margin-top: 6px;">
                      Razorpay ${payment.isSandbox ? "(Sandbox)" : "(Live)"}
                    </div>
                    <div style="font-size: 10px; color: #aaaaaa; margin-top: 2px;">
                      ID: ${payment.razorpayPaymentId || "N/A"}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered -->
          <tr>
            <td style="padding: 20px 28px;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                Items to Fulfill (${items.reduce((s, i) => s + i.quantity, 0)} Units):
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsList}
              </table>
            </td>
          </tr>

          <!-- Customer & Destination Details -->
          <tr>
            <td style="padding: 20px 28px; background-color: #141414; border-top: 1px solid #333333;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                Customer & Courier Destination:
              </div>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #e5e5e5; font-family: monospace;">
                <strong style="color: #ffffff;">${customer.fullName}</strong><br>
                Email: <a href="mailto:${customer.email}" style="color: #93c5fd;">${customer.email}</a><br>
                Phone: <a href="tel:${customer.phone}" style="color: #93c5fd;">${customer.phone}</a><br>
                Address: ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}, ${customer.city}, ${customer.state} — ${customer.pincode}
              </p>
              ${
                customer.orderNotes
                  ? `<div style="margin-top: 12px; padding: 10px; background-color: #262626; border-left: 3px solid #f59e0b; font-size: 12px; color: #fde68a;">
                      <strong>Special Request:</strong> ${customer.orderNotes}
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Action Steps -->
          <tr>
            <td style="padding: 24px 28px; text-align: center; border-top: 1px solid #333333;">
              <div style="font-size: 12px; color: #aaaaaa; margin-bottom: 14px;">
                Action Required: Inspect shell integrity, polish with virgin coconut oil, pack in archival gift box, and generate airway bill.
              </div>
              <span style="display: inline-block; padding: 10px 22px; background-color: #ffffff; color: #000000; font-weight: bold; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px;">
                Awaiting Studio Dispatch
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
