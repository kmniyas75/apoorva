import { OrderRecord } from "@/lib/types/checkout";

const SITE_URL = "https://www.apoorvashells.com";

function resolveImageUrl(img?: string): string {
  if (!img) return `${SITE_URL}/images/products/set1-coconut-coir.png`;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
}

export function generateAdminAlertHtml(order: OrderRecord): string {
  const { customer, items, pricing, orderId, payment } = order;
  const cleanPhone = customer.phone.replace(/\D/g, "");
  const waCustomerUrl = `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(
    `Namaskaram ${customer.fullName}! This is APOORVA SHELLS (Aluva, Kerala) regarding your order #${orderId}.`
  )}`;

  const itemsList = items
    .map((item) => {
      const imgUrl = resolveImageUrl(item.image);
      return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #2d2926;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="58" valign="top" style="padding-right: 14px;">
                <img src="${imgUrl}" alt="${item.name}" width="58" height="58" style="display: block; width: 58px; height: 58px; object-fit: cover; border-radius: 8px; border: 1px solid #3f3832;" />
              </td>
              <td valign="top" style="color: #ffffff; font-size: 13px;">
                <div style="font-weight: 700; color: #f7efe4;">🥥 ${item.name}</div>
                <div style="color: #b5a695; font-size: 11px; margin-top: 4px;">
                  📏 Size: <strong style="color: #ffffff;">${item.size}</strong> &bull; 🛍️ Qty: <strong style="color: #ffffff;">${item.quantity}</strong>
                </div>
              </td>
              <td valign="top" align="right" style="color: #4ade80; font-family: monospace; font-size: 14px; font-weight: 700; white-space: nowrap;">
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
  <title>⚡ [NEW ORDER #${orderId}] ₹${pricing.total.toLocaleString("en-IN")} — APOORVA SHELLS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0e0c0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 14px; background-color: #0e0c0b;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #181412; border: 1px solid #332c27; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.45);" cellpadding="0" cellspacing="0">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #10b981 0%, #d4af37 50%, #a855f7 100%);"></td>
          </tr>

          <!-- Studio Dispatch Header -->
          <tr>
            <td style="background-color: #1f1916; padding: 26px 28px; border-bottom: 1px solid #332c27;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background-color: #2e1065; color: #e9d5ff; border: 1px solid #7e22ce; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 20px;">
                      🐚 APOORVA SHELLS &bull; DISPATCH DESK
                    </span>
                    <h1 style="font-family: Georgia, serif; font-size: 23px; margin: 10px 0 0 0; color: #ffffff;">
                      ⚡ New Order Received: #${orderId}
                    </h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 5px 11px; background-color: #064e3b; color: #6ee7b7; font-size: 11px; font-weight: 700; border-radius: 6px; text-transform: uppercase;">
                      ${(order.source || "WEBSITE").toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Revenue & Gateway Metrics -->
          <tr>
            <td style="padding: 22px 28px; background-color: #211c18; border-bottom: 1px solid #332c27;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%">
                    <div style="font-size: 11px; color: #a39688; text-transform: uppercase; letter-spacing: 1px;">💰 Total Order Value</div>
                    <div style="font-size: 28px; font-weight: 800; color: #4ade80; margin-top: 4px; font-family: Georgia, serif;">
                      ₹${pricing.total.toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td width="50%" align="right">
                    <div style="font-size: 11px; color: #a39688; text-transform: uppercase; letter-spacing: 1px;">💳 Payment Status</div>
                    <div style="font-size: 14px; font-weight: 700; color: #60a5fa; margin-top: 6px;">
                      ✅ Razorpay (${(payment.method || "UPI").toUpperCase()})
                    </div>
                    <div style="font-size: 11px; color: #8c7f73; margin-top: 2px; font-family: monospace;">
                      Txn: ${payment.razorpayPaymentId || order.receiptNumber}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fulfillment Items -->
          <tr>
            <td style="padding: 22px 28px;">
              <div style="font-size: 11px; color: #c8a97e; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;">
                📦 Items to Pack &amp; Polish (${items.reduce((s, i) => s + i.quantity, 0)} Units)
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemsList}
              </table>
            </td>
          </tr>

          <!-- Customer Shipping Label & 1-Click Contact Buttons -->
          <tr>
            <td style="padding: 22px 28px; background-color: #14110f; border-top: 1px solid #332c27;">
              <div style="font-size: 11px; color: #c8a97e; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 10px;">
                📍 Customer &amp; Blue Dart Airway Label
              </div>
              <div style="background-color: #1c1815; border: 1px solid #332c27; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.7; color: #e7ded3;">
                <div>👤 <strong style="color: #ffffff; font-size: 15px;">${customer.fullName}</strong></div>
                <div>🏠 ${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}</div>
                <div>🌆 ${customer.city}, ${customer.state} — <strong style="color: #fbbf24;">PIN: ${customer.pincode}</strong></div>
                <div>📞 <a href="tel:${customer.phone}" style="color: #93c5fd; text-decoration: none;">${customer.phone}</a> &bull; ✉️ <a href="mailto:${customer.email}" style="color: #93c5fd; text-decoration: none;">${customer.email}</a></div>
              </div>

              ${
                customer.orderNotes
                  ? `<div style="margin-top: 12px; padding: 12px 14px; background-color: #292014; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; color: #fde68a;">
                      📝 <strong>Customer Note / Channel Info:</strong> ${customer.orderNotes}
                    </div>`
                  : ""
              }

              <!-- 1-Click Action Buttons for Admin -->
              <div style="margin-top: 18px; text-align: center;">
                <a href="${waCustomerUrl}" style="display: inline-block; background-color: #1fb855; color: #ffffff; padding: 11px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 6px; margin: 4px;">
                  💬 Message Customer on WhatsApp
                </a>
                <a href="${SITE_URL}" style="display: inline-block; background-color: #d4af37; color: #14110f; padding: 11px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 6px; margin: 4px;">
                  ⚙️ Open Admin Studio Panel &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Studio Checklist Footer -->
          <tr>
            <td style="padding: 18px 28px; background-color: #0e0c0b; text-align: center; border-top: 1px solid #26211d; font-size: 11px; color: #8c7f73;">
              🥥 1. Virgin Coconut Oil Polish &bull; 🌿 2. Inspect Cotton Lining &bull; 🕯️ 3. Wax-Seal Cedar Box &bull; ✈️ 4. Book Blue Dart AWB
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
