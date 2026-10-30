import { OrderRecord } from "@/lib/types/checkout";

export function generateShippingDispatchHtml(
  order: OrderRecord,
  trackingNumber: string = "BD-88492019IN",
  courierName: string = "Blue Dart Express",
  trackingUrl?: string
): string {
  const { customer, items, orderId } = order;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const finalTrackingUrl = trackingUrl || `${siteUrl}/track?orderId=${orderId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Archive Has Dispatched #${orderId} — APOORVA</title>
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
                EXOTIC APPAREL ATELIER &bull; DISPATCH DESK
              </div>
            </td>
          </tr>

          <!-- Courier Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #faf7f2; border-bottom: 1px solid #eee8dc;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #e0f2fe; color: #0369a1; font-family: monospace; font-size: 11px; font-weight: bold; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px;">
                In Transit &bull; Express Courier
              </span>
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #141414; margin: 12px 0 6px 0;">
                Your Archival Piece Has Left The Studio
              </h1>
              <p style="margin: 0; font-size: 13px; color: #5a5448;">
                Greetings ${customer.fullName}. Order <strong style="font-family: monospace; color: #141414;">#${orderId}</strong> has been hand-wrapped in our archival cedar packaging and handed over to our courier partner.
              </p>
            </td>
          </tr>

          <!-- Tracking Card -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background-color: #f7f3ec; border: 1px solid #e4dccc; border-radius: 4px; padding: 20px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <div style="font-family: monospace; font-size: 10px; letter-spacing: 1px; color: #767064; text-transform: uppercase;">
                        Courier Partner
                      </div>
                      <div style="font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #141414; margin-top: 2px;">
                        ${courierName}
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <div style="font-family: monospace; font-size: 10px; letter-spacing: 1px; color: #767064; text-transform: uppercase;">
                        Waybill / AWB No.
                      </div>
                      <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #141414; margin-top: 2px;">
                        ${trackingNumber}
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 18px; text-align: center;">
                  <a href="${finalTrackingUrl}" style="display: inline-block; background-color: #141414; color: #ffffff; padding: 12px 28px; font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; border-radius: 2px; font-weight: bold;">
                    Track Live Shipment &rarr;
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Contents Summary -->
          <tr>
            <td style="padding: 0 32px 20px;">
              <div style="font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #767064; text-transform: uppercase; margin-bottom: 8px;">
                Package Contents:
              </div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #141414; line-height: 1.6;">
                ${items.map((i) => `<li><strong>${i.name}</strong> — Size ${i.size} (${i.quantity}x)</li>`).join("")}
              </ul>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 20px 32px; background-color: #faf7f2; border-top: 1px solid #eee8dc; font-size: 12px; color: #5a5448;">
              <strong style="color: #141414;">Destination:</strong> ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}, ${customer.city}, ${customer.state} — ${customer.pincode}
            </td>
          </tr>

          <!-- Seal Instructions -->
          <tr>
            <td style="padding: 20px 32px; font-size: 12px; color: #767064; line-height: 1.6;">
              <strong style="color: #141414;">Tamper-Proof Notice:</strong> Please ensure the APOORVA wax-seal stamp on the outer box is intact upon courier arrival. Do not accept if broken.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #141414; padding: 24px 32px; text-align: center; color: #9c9589; font-size: 11px; font-family: monospace;">
              <div>APOORVA ATELIER &bull; INDIA</div>
              <div style="margin-top: 6px; color: #706a60;">© ${new Date().getFullYear()} APOORVA. Handcrafted in Aluva, Kerala.</div>
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
