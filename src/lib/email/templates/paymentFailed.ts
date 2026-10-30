import { OrderRecord } from "@/lib/types/checkout";

export function generatePaymentFailedHtml(
  order: OrderRecord,
  failureReason: string = "Transaction declined by issuing bank or canceled by user",
  retryCheckoutUrl: string = "http://localhost:3000?resumeCheckout=true"
): string {
  const { customer, items, pricing, orderId } = order;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payment Incomplete: Order #${orderId} — APOORVA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #141414; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3efe6; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e0d8ca; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04);" cellpadding="0" cellspacing="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #141414; padding: 36px 32px; text-align: center;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: normal; letter-spacing: 6px; color: #ffffff; text-transform: uppercase;">
                A P O O R V A
              </div>
              <div style="font-family: monospace; font-size: 10px; letter-spacing: 3px; color: #b89f80; text-transform: uppercase; margin-top: 6px;">
                EXOTIC APPAREL ATELIER
              </div>
            </td>
          </tr>

          <!-- Notice Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #fff7ed; border-bottom: 1px solid #fed7aa;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #fee2e2; color: #b91c1c; font-family: monospace; font-size: 11px; font-weight: bold; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px;">
                Payment Incomplete
              </span>
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #141414; margin: 12px 0 6px 0;">
                Your Archival Piece Is Still Reserved
              </h1>
              <p style="margin: 0; font-size: 13px; color: #7c2d12;">
                Hello ${customer.fullName}. We noticed that your recent checkout for order <strong style="font-family: monospace;">#${orderId}</strong> could not be completed (${failureReason}).
              </p>
            </td>
          </tr>

          <!-- Reservation Card -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background-color: #faf7f2; border: 1px solid #eee8dc; padding: 20px; text-align: center;">
                <div style="font-family: monospace; font-size: 11px; color: #767064; text-transform: uppercase; letter-spacing: 1px;">
                  Reserved Artisanal Items:
                </div>
                <div style="margin: 8px 0; font-family: Georgia, serif; font-size: 17px; font-weight: bold; color: #141414;">
                  ${items.map((i) => i.name).join(" + ")}
                </div>
                <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #141414; margin-bottom: 16px;">
                  Total: ₹${pricing.total.toLocaleString("en-IN")}
                </div>

                <a href="${retryCheckoutUrl}" style="display: inline-block; background-color: #141414; color: #ffffff; padding: 13px 32px; font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; border-radius: 30px; font-weight: bold;">
                  Resume Secure Checkout &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Assistance -->
          <tr>
            <td style="padding: 10px 32px 28px; font-size: 12px; color: #767064; line-height: 1.6;">
              <strong style="color: #141414;">Need help with payment?</strong> If your card was declined, UPI timed out, or you require assistance with netbanking, our concierge desk is available to assist via WhatsApp or direct email reply.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #141414; padding: 24px 32px; text-align: center; color: #9c9589; font-size: 11px; font-family: monospace;">
              <div>APOORVA ATELIER &bull; INDIA</div>
              <div style="margin-top: 6px; color: #706a60;">© ${new Date().getFullYear()} APOORVA. All Rights Reserved.</div>
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
