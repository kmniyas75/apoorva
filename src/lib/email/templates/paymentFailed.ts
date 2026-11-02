import { OrderRecord } from "@/lib/types/checkout";

const SITE_URL = "https://www.apoorvashells.com";

function resolveImageUrl(img?: string): string {
  if (!img) return `${SITE_URL}/images/products/set1-coconut-coir.png`;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
}

export function generatePaymentFailedHtml(
  order: OrderRecord,
  failureReason: string = "Transaction was interrupted or timed out before completion",
  retryCheckoutUrl?: string
): string {
  const { customer, items, pricing, orderId } = order;
  const finalCheckoutUrl =
    retryCheckoutUrl && !retryCheckoutUrl.includes("apoorva-eight")
      ? retryCheckoutUrl
      : `${SITE_URL}/?payOrder=${encodeURIComponent(orderId)}`;
  const whatsappUrl = `https://wa.me/917306409010?text=${encodeURIComponent(
    `Hi APOORVA Atelier! Please help me complete payment for my reserved order #${orderId}.`
  )}`;

  const itemsHtml = items
    .map((item) => {
      const imgUrl = resolveImageUrl(item.image);
      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eadfce;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="60" valign="top" style="padding-right: 14px;">
                <img src="${imgUrl}" alt="${item.name}" width="60" height="60" style="display: block; width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #e2d5c1;" />
              </td>
              <td valign="middle">
                <div style="font-family: Georgia, serif; font-size: 14px; font-weight: bold; color: #1c1613;">
                  🥥 ${item.name}
                </div>
                <div style="font-size: 12px; color: #6e6053; margin-top: 3px;">
                  📏 Size: <strong>${item.size}</strong> &bull; 🛍️ Qty: <strong>${item.quantity}</strong>
                </div>
              </td>
              <td valign="middle" align="right" style="font-family: Georgia, serif; font-size: 15px; font-weight: bold; color: #1c1613;">
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
  <title>🐚 Your APOORVA Piece Is Reserved (#${orderId}) — Complete Checkout</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2ebe1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1613; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2ebe1; padding: 36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border: 1px solid #dfd3c0; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(28, 22, 19, 0.08);" cellpadding="0" cellspacing="0">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #d97706 0%, #d4af37 50%, #8c5a3c 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color: #161210; padding: 36px 32px 30px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #261f1b; border: 1px solid #b89768; font-size: 22px; margin-bottom: 12px;">
                ⏳
              </div>
              <div style="font-family: Georgia, serif; font-size: 28px; font-weight: normal; letter-spacing: 7px; color: #ffffff; text-transform: uppercase;">
                A P O O R V A
              </div>
              <div style="font-size: 10px; letter-spacing: 3px; color: #c8a97e; text-transform: uppercase; margin-top: 6px; font-weight: 600;">
                🐚 PRIVATE RESERVATION CONCIERGE &bull; ALUVA, KERALA
              </div>
            </td>
          </tr>

          <!-- Notice Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #fffaf3; border-bottom: 1px solid #f5e2c8; text-align: center;">
              <span style="display: inline-block; padding: 6px 14px; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.2px; border: 1px solid #fde68a;">
                ⏳ Artisanal Piece Held For 24 Hours
              </span>
              <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: normal; color: #1c1613; margin: 16px 0 8px 0;">
                We Held Your APOORVA Selection, ${customer.fullName}
              </h1>
              <p style="margin: 0 auto; max-width: 480px; font-size: 14px; color: #6e553b; line-height: 1.6;">
                We noticed payment for your order <strong style="color: #1c1613;">#${orderId}</strong> wasn't completed (<em>${failureReason}</em>). Because our sets are handcrafted in small batches in Aluva, Kerala, we have reserved your piece so you can complete checkout with 1 click.
              </p>
            </td>
          </tr>

          <!-- Reserved Items Card -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background-color: #fcf9f4; border: 1px solid #e8dccb; border-radius: 12px; padding: 22px;">
                <div style="font-size: 11px; font-weight: 700; color: #8c6d46; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; border-bottom: 1px solid #eadfce; padding-bottom: 6px;">
                  🛍️ Reserved Artisanal Pieces (#${orderId})
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                </table>

                <div style="margin-top: 16px; display: flex; justify-content: space-between; text-align: right; font-family: Georgia, serif; font-size: 17px; font-weight: bold; color: #1c1613;">
                  Total Payable: ₹${pricing.total.toLocaleString("en-IN")} <span style="font-size: 12px; color: #137333; font-weight: 600;">(Free Express Shipping)</span>
                </div>

                <div style="margin-top: 22px; text-align: center;">
                  <a href="${finalCheckoutUrl}" style="display: inline-block; background-color: #161210; color: #ffffff; padding: 14px 30px; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 4px;">
                    💳 Complete 1-Click Payment &rarr;
                  </a>
                  <a href="${whatsappUrl}" style="display: inline-block; background-color: #1fb855; color: #ffffff; padding: 14px 22px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 4px;">
                    💬 Pay via WhatsApp Concierge
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Assistance -->
          <tr>
            <td style="padding: 4px 32px 26px; font-size: 12px; color: #6e6053; line-height: 1.6; text-align: center;">
              🤝 <strong>Need instant assistance with UPI, GPay, or Cards?</strong> Reply directly to this email or message our WhatsApp Concierge at <strong>+91 73064 09010</strong>.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #161210; padding: 26px 32px; text-align: center; color: #a39688; font-size: 11px;">
              <div style="letter-spacing: 3px; color: #ffffff; font-weight: 700; margin-bottom: 6px;">
                🐚 APOORVA COASTAL ATELIER &bull; ALUVA, KERALA
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
