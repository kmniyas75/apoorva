import { OrderRecord } from "@/lib/types/checkout";

export function generateOrderConfirmationHtml(order: OrderRecord): string {
  const { customer, items, pricing, orderId, payment } = order;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e8e2d5;">
          <div style="font-family: Georgia, serif; font-size: 14px; font-weight: bold; color: #141414; text-transform: uppercase; letter-spacing: 0.5px;">
            ${item.name}
          </div>
          ${item.subName ? `<div style="font-size: 11px; color: #767064; text-transform: uppercase; margin-top: 3px; font-family: monospace;">${item.subName}</div>` : ""}
          <div style="font-size: 12px; color: #5a5448; margin-top: 4px; font-family: monospace;">
            Size: <strong style="color: #141414;">${item.size}</strong> &bull; Qty: <strong style="color: #141414;">${item.quantity}</strong>
          </div>
        </td>
        <td style="padding: 16px 0; border-bottom: 1px solid #e8e2d5; text-align: right; vertical-align: top; font-family: monospace; font-size: 14px; font-weight: bold; color: #141414;">
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Archival Acquisition #${orderId} — APOORVA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #141414; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3efe6; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e0d8ca; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04);" cellpadding="0" cellspacing="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #141414; padding: 36px 32px; text-align: center;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: normal; letter-spacing: 6px; color: #ffffff; text-transform: uppercase;">
                A P O O R V A
              </div>
              <div style="font-family: monospace; font-size: 10px; letter-spacing: 3px; color: #b89f80; text-transform: uppercase; margin-top: 6px;">
                COASTAL BEACHWEAR ATELIER &bull; ALUVA, KERALA
              </div>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #faf7f2; border-bottom: 1px solid #eee8dc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background-color: #e8f5e9; color: #1b5e20; font-family: monospace; font-size: 11px; font-weight: bold; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px;">
                      Payment Verified &bull; Confirmed
                    </span>
                    <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #141414; margin: 12px 0 6px 0;">
                      Thank You, ${customer.fullName}
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #5a5448; font-family: -apple-system, sans-serif;">
                      Your artisanal order <strong style="color: #141414; font-family: monospace;">#${orderId}</strong> has been received by our Aluva, Kerala studio. Each piece is undergoing hand-inspection prior to dispatch.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Summary Details -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: monospace; font-size: 11px; color: #767064; text-transform: uppercase; border-bottom: 1px solid #eee8dc; padding-bottom: 16px;">
                <tr>
                  <td style="width: 50%;">
                    <div>Order Ref: <strong style="color: #141414;">#${orderId}</strong></div>
                    <div style="margin-top: 4px;">Date: <strong style="color: #141414;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></div>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <div>Payment: <strong style="color: #141414;">Razorpay</strong></div>
                    <div style="margin-top: 4px;">Txn ID: <strong style="color: #141414;">${payment.razorpayPaymentId || "Simulated"}</strong></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Price Calculations -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: monospace; font-size: 12px; color: #5a5448;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; color: #141414;">₹${pricing.rawSubtotal.toLocaleString("en-IN")}</td>
                </tr>
                ${pricing.discountAmount > 0
      ? `<tr>
                        <td style="padding: 4px 0; color: #1b5e20;">VIP Privilege (${pricing.discountPercentage}%)</td>
                        <td style="padding: 4px 0; text-align: right; color: #1b5e20;">-₹${pricing.discountAmount.toLocaleString("en-IN")}</td>
                      </tr>`
      : ""
    }
                <tr>
                  <td style="padding: 4px 0;">Express Courier (India)</td>
                  <td style="padding: 4px 0; text-align: right; color: #141414;">
                    ${pricing.shippingFee === 0 ? "COMPLIMENTARY" : `₹${pricing.shippingFee.toLocaleString("en-IN")}`}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0 4px; border-top: 1px solid #141414; font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #141414;">
                    Total Settled
                  </td>
                  <td style="padding: 14px 0 4px; border-top: 1px solid #141414; text-align: right; font-family: monospace; font-size: 17px; font-weight: bold; color: #141414;">
                    ₹${pricing.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination -->
          <tr>
            <td style="padding: 24px 32px; background-color: #faf7f2; border-top: 1px solid #eee8dc;">
              <h3 style="margin: 0 0 10px 0; font-family: monospace; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #767064;">
                Shipping Destination
              </h3>
              <p style="margin: 0; font-size: 13px; color: #141414; line-height: 1.6;">
                <strong>${customer.fullName}</strong><br>
                ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}<br>
                ${customer.city}, ${customer.state} — ${customer.pincode}<br>
                Contact: ${customer.phone}
              </p>
            </td>
          </tr>

          <!-- Care & Atelier Promise -->
          <tr>
            <td style="padding: 24px 32px; font-size: 12px; color: #767064; line-height: 1.6;">
              <strong style="color: #141414;">Atelier Guarantee:</strong> All coconut shells are treated with organic virgin coconut oil and lined with soft cotton. Keep away from harsh detergents. If you have any inquiries, reply directly to this email or reach our personal concierge desk.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #141414; padding: 24px 32px; text-align: center; color: #9c9589; font-size: 11px; font-family: monospace;">
              <div style="letter-spacing: 2px; color: #ffffff; margin-bottom: 6px;">APOORVA ATELIER &bull; INDIA</div>
              <div>Bespoke Handcrafted Exotic Innerwear</div>
              <div style="margin-top: 8px; color: #706a60;">© ${new Date().getFullYear()} APOORVA. All Rights Reserved.</div>
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
