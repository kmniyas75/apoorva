import { OrderRecord } from "@/lib/types/checkout";

const SITE_URL = "https://www.apoorvashells.com";

function resolveImageUrl(img?: string): string {
  if (!img) return `${SITE_URL}/images/products/set1-coconut-coir.png`;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
}

export function generateShippingDispatchHtml(
  order: OrderRecord,
  trackingNumber: string = "BD-88492019IN",
  courierName: string = "Blue Dart Express (Air Cargo)",
  trackingUrl?: string
): string {
  const { customer, items, orderId } = order;
  const finalTrackingUrl =
    trackingUrl && !trackingUrl.includes("bluedart.com")
      ? trackingUrl
      : `${SITE_URL}/track?orderId=${encodeURIComponent(orderId)}`;
  const whatsappUrl = `https://wa.me/917306409010?text=${encodeURIComponent(
    `Hi APOORVA SHELLS! I'm tracking my dispatched order #${orderId} (Waybill: ${trackingNumber}).`
  )}`;

  const itemsHtml = items
    .map((item) => {
      const imgUrl = resolveImageUrl(item.image);
      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #ece3d5;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="56" valign="top" style="padding-right: 14px;">
                <img src="${imgUrl}" alt="${item.name}" width="56" height="56" style="display: block; width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e2d5c1;" />
              </td>
              <td valign="middle">
                <div style="font-family: Georgia, serif; font-size: 14px; font-weight: bold; color: #1c1613;">
                  🥥 ${item.name}
                </div>
                <div style="font-size: 12px; color: #6e6053; margin-top: 3px;">
                  📏 Size: <strong>${item.size}</strong> &bull; 🛍️ Qty: <strong>${item.quantity}</strong>
                </div>
              </td>
              <td valign="middle" align="right">
                <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
                  ✈️ Dispatched
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>✈️ Your APOORVA SHELLS Order #${orderId} Has Shipped — Waybill ${trackingNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2ebe1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1613; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2ebe1; padding: 36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border: 1px solid #dfd3c0; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(28, 22, 19, 0.08);" cellpadding="0" cellspacing="0">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #0284c7 0%, #d4af37 50%, #8c5a3c 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #161210; padding: 36px 32px 30px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #261f1b; border: 1px solid #b89768; font-size: 22px; margin-bottom: 12px;">
                ✈️
              </div>
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: normal; letter-spacing: 5px; color: #ffffff; text-transform: uppercase;">
                APOORVA SHELLS
              </div>
              <div style="font-size: 10px; letter-spacing: 3px; color: #c8a97e; text-transform: uppercase; margin-top: 6px; font-weight: 600;">
                🐚 COASTAL RESORTWEAR ATELIER &bull; EXPRESS AIR DISPATCH
              </div>
            </td>
          </tr>

          <!-- Hero Dispatch Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #fcf9f4; border-bottom: 1px solid #ede3d4; text-align: center;">
              <span style="display: inline-block; padding: 6px 14px; background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.2px; border: 1px solid #bae6fd;">
                ✈️ In Transit &bull; Express Air Courier
              </span>
              <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: normal; color: #1c1613; margin: 16px 0 8px 0;">
                Your APOORVA SHELLS Piece Is On Its Way!
              </h1>
              <p style="margin: 0 auto; max-width: 480px; font-size: 14px; color: #5c5046; line-height: 1.6;">
                Greetings ${customer.fullName}! Your order <strong style="color: #1c1613;">#${orderId}</strong> has been hand-wrapped in our wax-sealed resort gift box at our Aluva, Kerala studio and handed over to <strong>${courierName}</strong>.
              </p>
            </td>
          </tr>

          <!-- 4-Step Visual Progress Tracker -->
          <tr>
            <td style="padding: 20px 24px; background-color: #ffffff; border-bottom: 1px solid #f0e8dc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align: center; font-size: 11px;">
                <tr>
                  <td width="25%" style="color: #137333; font-weight: 700;">
                    <div style="font-size: 18px; margin-bottom: 4px;">✅</div>
                    1. Confirmed
                  </td>
                  <td width="25%" style="color: #137333; font-weight: 700;">
                    <div style="font-size: 18px; margin-bottom: 4px;">✅</div>
                    2. Oil Cured
                  </td>
                  <td width="25%" style="color: #0369a1; font-weight: 800;">
                    <div style="font-size: 18px; margin-bottom: 4px;">✈️</div>
                    3. In Transit
                  </td>
                  <td width="25%" style="color: #8c6d46; font-weight: 600;">
                    <div style="font-size: 18px; margin-bottom: 4px;">🏡</div>
                    4. 2–3 Days
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Boarding Pass Waybill Card -->
          <tr>
            <td style="padding: 26px 32px;">
              <div style="background: linear-gradient(135deg, #1b1613 0%, #2b221d 100%); border: 1px solid #b89768; border-radius: 12px; padding: 24px; color: #ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="55%">
                      <div style="font-size: 10px; letter-spacing: 1.5px; color: #c8a97e; text-transform: uppercase; font-weight: 700;">
                        ✈️ Express Courier Partner
                      </div>
                      <div style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #ffffff; margin-top: 4px;">
                        ${courierName}
                      </div>
                      <div style="font-size: 12px; color: #d6c7b2; margin-top: 6px;">
                        ⚡ Estimated Arrival: <strong>2–3 Business Days</strong>
                      </div>
                    </td>
                    <td width="45%" align="right" valign="top">
                      <div style="font-size: 10px; letter-spacing: 1.5px; color: #c8a97e; text-transform: uppercase; font-weight: 700;">
                        📦 Air Waybill (AWB)
                      </div>
                      <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #fbbf24; margin-top: 4px; background-color: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 6px; display: inline-block;">
                        ${trackingNumber}
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 22px; text-align: center; border-top: 1px dashed #4a3c32; padding-top: 18px;">
                  <a href="${finalTrackingUrl}" style="display: inline-block; background-color: #d4af37; color: #161210; padding: 13px 28px; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; border-radius: 8px; font-weight: 800; margin: 4px;">
                    🚚 Track Live Shipment &rarr;
                  </a>
                  <a href="${whatsappUrl}" style="display: inline-block; background-color: #1fb855; color: #ffffff; padding: 13px 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 4px;">
                    💬 WhatsApp Support
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Dispatched Items with Product Thumbnails -->
          <tr>
            <td style="padding: 0 32px 22px;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #8c6d46; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #eadfce; padding-bottom: 6px;">
                🎁 Dispatched Package Contents
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Destination & Wax-Seal Notice -->
          <tr>
            <td style="padding: 22px 32px; background-color: #fcf9f4; border-top: 1px solid #ede3d4;">
              <div style="font-size: 13px; color: #1c1613; margin-bottom: 10px;">
                📍 <strong>Delivery Address:</strong> ${customer.fullName}, ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}, ${customer.city}, ${customer.state} — <strong>${customer.pincode}</strong>
              </div>
              <div style="font-size: 12px; color: #6e6053; background-color: #f5efe4; padding: 12px 14px; border-radius: 8px; border-left: 3px solid #8c5a3c;">
                🕯️ <strong>Tamper-Proof Wax Seal Guarantee:</strong> Please verify that the APOORVA SHELLS artisanal seal on your outer gift box is intact upon delivery.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #161210; padding: 26px 32px; text-align: center; color: #a39688; font-size: 11px;">
              <div style="letter-spacing: 3px; color: #ffffff; font-weight: 700; margin-bottom: 6px;">
                🐚 APOORVA SHELLS &bull; ALUVA, KERALA
              </div>
              <div style="color: #6e645a; font-size: 10px;">
                © ${new Date().getFullYear()} APOORVA SHELLS (<a href="${SITE_URL}" style="color: #8c7f73;">www.apoorvashells.com</a>). Handcrafted in Kerala, India.
              </div>
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
