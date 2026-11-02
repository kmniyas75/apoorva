import { OrderRecord } from "@/lib/types/checkout";

const SITE_URL = "https://www.apoorvashells.com";

function resolveImageUrl(img?: string): string {
  if (!img) return `${SITE_URL}/images/products/set1-coconut-coir.png`;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
}

export function generateOrderConfirmationHtml(order: OrderRecord): string {
  const { customer, items, pricing, orderId, payment } = order;
  const trackingUrl = `${SITE_URL}/track?orderId=${encodeURIComponent(orderId)}`;
  const whatsappUrl = `https://wa.me/917306409010?text=${encodeURIComponent(
    `Hi APOORVA Atelier! I have a question regarding my confirmed order #${orderId}.`
  )}`;

  const itemsHtml = items
    .map((item) => {
      const imgUrl = resolveImageUrl(item.image);
      return `
      <tr>
        <td style="padding: 18px 0; border-bottom: 1px solid #eadfce;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="72" valign="top" style="padding-right: 16px;">
                <img src="${imgUrl}" alt="${item.name}" width="72" height="72" style="display: block; width: 72px; height: 72px; object-fit: cover; border-radius: 10px; border: 1px solid #e2d5c1; background-color: #f9f5ee;" />
              </td>
              <td valign="top">
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: bold; color: #1c1613; letter-spacing: 0.4px;">
                  🥥 ${item.name}
                </div>
                ${
                  item.subName
                    ? `<div style="font-size: 11px; color: #8c6d46; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; font-weight: 600;">${item.subName}</div>`
                    : ""
                }
                <div style="margin-top: 8px;">
                  <span style="display: inline-block; background-color: #f4ede2; color: #4a3b2c; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; margin-right: 6px;">
                    📏 Size: ${item.size}
                  </span>
                  <span style="display: inline-block; background-color: #f4ede2; color: #4a3b2c; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px;">
                    🛍️ Qty: ${item.quantity}
                  </span>
                </div>
              </td>
              <td valign="top" align="right" style="font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: #1c1613; white-space: nowrap;">
                ₹${item.totalPrice.toLocaleString("en-IN")}
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
  <title>Order Confirmed #${orderId} — APOORVA Coastal Atelier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2ebe1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1613; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2ebe1; padding: 36px 14px;">
    <tr>
      <td align="center">
        <!-- Main Luxury Card -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border: 1px solid #dfd3c0; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(28, 22, 19, 0.08);" cellpadding="0" cellspacing="0">
          
          <!-- Top Gold Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #8c5a3c 0%, #d4af37 50%, #8c5a3c 100%);"></td>
          </tr>

          <!-- Brand Crest Header -->
          <tr>
            <td style="background-color: #161210; padding: 36px 32px 30px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #261f1b; border: 1px solid #b89768; font-size: 22px; margin-bottom: 12px;">
                🐚
              </div>
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; letter-spacing: 7px; color: #ffffff; text-transform: uppercase;">
                A P O O R V A
              </div>
              <div style="font-size: 10px; letter-spacing: 3px; color: #c8a97e; text-transform: uppercase; margin-top: 6px; font-weight: 600;">
                🌴 HANDCRAFTED COASTAL RESORTWEAR &bull; ALUVA, KERALA
              </div>
            </td>
          </tr>

          <!-- Hero Greeting & Verified Badge -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #fcf9f4; border-bottom: 1px solid #ede3d4; text-align: center;">
              <span style="display: inline-block; padding: 6px 14px; background-color: #e6f4ea; color: #137333; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.2px; border: 1px solid #ceead6;">
                ✅ Payment Verified &bull; Order Confirmed
              </span>
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 25px; font-weight: normal; color: #1c1613; margin: 16px 0 8px 0;">
                Namaskaram &amp; Thank You, ${customer.fullName}!
              </h1>
              <p style="margin: 0 auto; max-width: 480px; font-size: 14px; color: #5c5046; line-height: 1.6;">
                Your artisanal acquisition <strong style="color: #1c1613;">#${orderId}</strong> is confirmed at our Aluva, Kerala studio. Our master artisans are hand-polishing and inspecting your piece for express dispatch.
              </p>
            </td>
          </tr>

          <!-- 4-Step Visual Progress Tracker -->
          <tr>
            <td style="padding: 22px 24px; background-color: #ffffff; border-bottom: 1px solid #f0e8dc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align: center; font-size: 11px;">
                <tr>
                  <td width="25%" style="color: #137333; font-weight: 700;">
                    <div style="font-size: 18px; margin-bottom: 4px;">✅</div>
                    1. Confirmed
                  </td>
                  <td width="25%" style="color: #8c5a3c; font-weight: 700;">
                    <div style="font-size: 18px; margin-bottom: 4px;">🥥</div>
                    2. Oil Curing
                  </td>
                  <td width="25%" style="color: #9e9183;">
                    <div style="font-size: 18px; margin-bottom: 4px;">📦</div>
                    3. Gift Boxed
                  </td>
                  <td width="25%" style="color: #9e9183;">
                    <div style="font-size: 18px; margin-bottom: 4px;">✈️</div>
                    4. Air Express
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Meta Bar -->
          <tr>
            <td style="padding: 20px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf6ef; border: 1px solid #ebe1d1; border-radius: 8px; padding: 14px 18px; font-size: 12px; color: #6e6053;">
                <tr>
                  <td width="50%">
                    <div>🧾 <strong>Order ID:</strong> <span style="color: #1c1613; font-weight: 700;">#${orderId}</span></div>
                    <div style="margin-top: 4px;">📅 <strong>Date:</strong> <span style="color: #1c1613;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                  </td>
                  <td width="50%" align="right">
                    <div>💳 <strong>Payment:</strong> <span style="color: #1c1613; font-weight: 700;">Razorpay (${(payment.method || "UPI / Card").toUpperCase()})</span></div>
                    <div style="margin-top: 4px;">🔐 <strong>Ref:</strong> <span style="color: #1c1613; font-family: monospace;">${payment.razorpayPaymentId || order.receiptNumber}</span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ordered Items with Product Thumbnails -->
          <tr>
            <td style="padding: 12px 32px 8px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8c6d46; margin-top: 12px; padding-bottom: 6px; border-bottom: 1px solid #eadfce;">
                🛍️ Your Handcrafted Selection
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Price Breakdown -->
          <tr>
            <td style="padding: 8px 32px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #5c5046;">
                <tr>
                  <td style="padding: 5px 0;">Artisanal Subtotal</td>
                  <td style="padding: 5px 0; text-align: right; color: #1c1613; font-weight: 600;">₹${pricing.rawSubtotal.toLocaleString("en-IN")}</td>
                </tr>
                ${
                  pricing.discountAmount > 0
                    ? `<tr>
                        <td style="padding: 5px 0; color: #137333; font-weight: 600;">🎁 Bundle Privilege (${pricing.discountPercentage}% OFF)</td>
                        <td style="padding: 5px 0; text-align: right; color: #137333; font-weight: 700;">-₹${pricing.discountAmount.toLocaleString("en-IN")}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 5px 0;">✈️ Blue Dart / Delhivery Air Express</td>
                  <td style="padding: 5px 0; text-align: right; color: #137333; font-weight: 700;">
                    ${pricing.shippingFee === 0 ? "FREE EXPRESS" : `₹${pricing.shippingFee.toLocaleString("en-IN")}`}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0 4px; border-top: 2px solid #1c1613; font-family: Georgia, serif; font-size: 17px; font-weight: bold; color: #1c1613;">
                    Total Paid
                  </td>
                  <td style="padding: 14px 0 4px; border-top: 2px solid #1c1613; text-align: right; font-family: Georgia, serif; font-size: 19px; font-weight: bold; color: #1c1613;">
                    ₹${pricing.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Buttons -->
          <tr>
            <td style="padding: 0 32px 28px; text-align: center;">
              <a href="${trackingUrl}" style="display: inline-block; background-color: #161210; color: #ffffff; padding: 14px 28px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; border-radius: 8px; margin: 4px;">
                🚚 Track Live Order Status &rarr;
              </a>
              <a href="${whatsappUrl}" style="display: inline-block; background-color: #1fb855; color: #ffffff; padding: 14px 22px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px; margin: 4px;">
                💬 WhatsApp Concierge
              </a>
            </td>
          </tr>

          <!-- Shipping Address Card -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fcf9f4; border-top: 1px solid #ede3d4; border-bottom: 1px solid #ede3d4;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 12px;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #8c6d46; margin-bottom: 6px;">
                      📍 Delivery Destination
                    </div>
                    <div style="font-size: 13px; color: #1c1613; line-height: 1.6;">
                      <strong>${customer.fullName}</strong><br>
                      ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}<br>
                      ${customer.city}, ${customer.state} — <strong>${customer.pincode}</strong><br>
                      📞 ${customer.phone}
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 12px; border-left: 1px solid #e6dac8;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #8c6d46; margin-bottom: 6px;">
                      🌴 Atelier Craftsmanship
                    </div>
                    <div style="font-size: 12px; color: #5c5046; line-height: 1.6;">
                      🥥 <strong>Virgin Coconut Oil Cured</strong><br>
                      🌿 <strong>100% Organic Cotton Lined</strong><br>
                      🎁 <strong>Discreet Resort Gift Box</strong><br>
                      ⚡ <strong>Est. Arrival: 2–3 Business Days</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #161210; padding: 28px 32px; text-align: center; color: #a39688; font-size: 11px;">
              <div style="letter-spacing: 3px; color: #ffffff; font-weight: 700; margin-bottom: 6px;">
                🐚 APOORVA COASTAL ATELIER &bull; ALUVA, KERALA
              </div>
              <div style="color: #c8a97e; margin-bottom: 12px;">
                Handcrafted Coconut Shell, Tender Coir &amp; Jute Resortwear
              </div>
              <div style="margin-bottom: 12px;">
                <a href="${SITE_URL}" style="color: #ffffff; text-decoration: underline; margin: 0 8px;">Website</a> &bull;
                <a href="${trackingUrl}" style="color: #ffffff; text-decoration: underline; margin: 0 8px;">Track Order</a> &bull;
                <a href="https://wa.me/917306409010" style="color: #ffffff; text-decoration: underline; margin: 0 8px;">+91 73064 09010</a>
              </div>
              <div style="color: #6e645a; font-size: 10px;">
                © ${new Date().getFullYear()} APOORVA Shells (<a href="${SITE_URL}" style="color: #8c7f73;">www.apoorvashells.com</a>). All Rights Reserved.
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
