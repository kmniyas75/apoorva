const DEFAULT_META_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBS7ZBGcseYFElhA2BiVrZCS0poQZArCUgj8OyW6CigfA8qqqpTBTEyXvGKBM6K6TGeMpyBFA4hzWd35QzbPLKNiVrZAb055Yttu1VLLst7dX5LA27QoYMlzHeG7D9F8RwDGNK7ww72POcfCZArLk65eLgbefm3sifcHPhZCXcwbG3bT1JAOGTI5zwZDZD",
  "utf8"
).toString("base64");

const DEFAULT_IG_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBSzripRmiM5FIBlwWFZA4fmeTBUNURWAdoUMF0q9zVkKZBdXpK3OfiZA12RvnvrafkKCswpexr78LpmhT5Nxi2EEjaG6LaBTK4bWgUAHClPDOkPdkCkzsr9LghKiDFBRFQMZBNhyqfZAT0qlu2ZBOAVDj8uf5xp7jup94oTACU78qv1PV5ZCWBGOJGAHt4q1ejMOq42FZCCkW7VZARtcE9YyuQrFHJuksuQ2Ew6eFCNPM78AZDZD",
  "utf8"
).toString("base64");

const DEFAULT_FB_PAGE_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBS8T5KkxyRZBboqI3mAzTZAc1yniKLbbkCKhYhTTy6A9cGKSnjAo3Jb5u8XiWgVTwCUyMcnfOw2lFeFbPRHV5gZCmhlxLNqQBqcYmc6ZC2yeCqKVf5BVu5zMBghrNkR3KeE0xnsGAQBZC8h85ZC13OFFjUkf0bsyj3gZBQ7smxyK9xeDCyMn7GC6MHrl2HWAtAZDZD",
  "utf8"
).toString("base64");

function cleanEnv(val?: string): string {
  return (val || "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function getMetaWhatsAppConfig() {
  const accessToken =
    cleanEnv(process.env.META_ACCESS_TOKEN) ||
    cleanEnv(process.env.WHATSAPP_ACCESS_TOKEN) ||
    Buffer.from(DEFAULT_META_TOKEN_B64, "base64").toString("utf8");

  const instagramAccessToken =
    cleanEnv(process.env.INSTAGRAM_ACCESS_TOKEN) ||
    Buffer.from(DEFAULT_IG_TOKEN_B64, "base64").toString("utf8");

  const instagramAccountId =
    cleanEnv(process.env.INSTAGRAM_ACCOUNT_ID) || "17841418464150754";

  const facebookPageAccessToken =
    cleanEnv(process.env.FACEBOOK_PAGE_ACCESS_TOKEN) ||
    Buffer.from(DEFAULT_FB_PAGE_TOKEN_B64, "base64").toString("utf8");

  const facebookPageId =
    cleanEnv(process.env.FACEBOOK_PAGE_ID) || "1378312578702288";

  const phoneNumberId =
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID) || "1332497489956818";

  const wabaId =
    cleanEnv(process.env.WHATSAPP_WABA_ID) || "1978745913089125";

  const testNumber =
    cleanEnv(process.env.WHATSAPP_TEST_NUMBER) || "+91 73064 09010";

  const graphVersion = cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";

  return {
    accessToken,
    instagramAccessToken,
    instagramAccountId,
    facebookPageAccessToken,
    facebookPageId,
    phoneNumberId,
    wabaId,
    testNumber,
    graphVersion
  };
}

/**
 * Formats a phone number into E.164 digits (e.g. "919847055112") for Meta WhatsApp Cloud API.
 */
export function normalizeWhatsAppRecipient(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Normalizes markdown for WhatsApp (converts `**bold**` to `*bold*`).
 */
export function formatWhatsAppMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "*$1*");
}

/**
 * Sends a real WhatsApp text message via Meta Graph API (`v25.0/{PHONE_NUMBER_ID}/messages`).
 */
export async function sendWhatsAppTextMessage(params: {
  to: string;
  body: string;
  previewUrl?: boolean;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken, phoneNumberId, graphVersion } = getMetaWhatsAppConfig();
  const recipient = normalizeWhatsAppRecipient(params.to);

  if (!recipient || !accessToken) {
    return { sent: false, error: "Missing recipient or Meta access token" };
  }

  const formattedBody = formatWhatsAppMarkdown(params.body);

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: {
            preview_url: Boolean(params.previewUrl),
            body: formattedBody
          }
        }),
        cache: "no-store"
      }
    );

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        sent: false,
        error: data.error?.message || `Meta API HTTP ${res.status}`
      };
    }

    return {
      sent: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "WhatsApp API request failed"
    };
  }
}

/**
 * Sends a real WhatsApp image message with caption via Meta Graph API.
 */
export async function sendWhatsAppImageMessage(params: {
  to: string;
  imageUrl: string;
  caption?: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken, phoneNumberId, graphVersion } = getMetaWhatsAppConfig();
  const recipient = normalizeWhatsAppRecipient(params.to);

  if (!recipient || !accessToken) {
    return { sent: false, error: "Missing recipient or Meta access token" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "image",
          image: {
            link: params.imageUrl,
            ...(params.caption
              ? { caption: formatWhatsAppMarkdown(params.caption) }
              : {})
          }
        }),
        cache: "no-store"
      }
    );

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        sent: false,
        error: data.error?.message || `Meta Image API HTTP ${res.status}`
      };
    }

    return {
      sent: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "WhatsApp image send failed"
    };
  }
}

/**
 * Sends an interactive WhatsApp Reply Button message (up to 3 tap buttons, with optional header image).
 * Falls back to `sendWhatsAppTextMessage` if the interactive call fails.
 */
export async function sendWhatsAppInteractiveButtons(params: {
  to: string;
  bodyText: string;
  footerText?: string;
  headerImageUrl?: string;
  buttons: Array<{ id: string; title: string }>;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken, phoneNumberId, graphVersion } = getMetaWhatsAppConfig();
  const recipient = normalizeWhatsAppRecipient(params.to);

  if (!recipient || !accessToken) {
    return { sent: false, error: "Missing recipient or Meta access token" };
  }

  const formattedBody = formatWhatsAppMarkdown(params.bodyText);
  const safeButtons = params.buttons.slice(0, 3).map((b, idx) => ({
    type: "reply",
    reply: {
      id: b.id || `btn_${idx + 1}`,
      title: b.title.trim().slice(0, 20)
    }
  }));

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "interactive",
          interactive: {
            type: "button",
            ...(params.headerImageUrl
              ? {
                  header: {
                    type: "image",
                    image: { link: params.headerImageUrl }
                  }
                }
              : {}),
            body: {
              text: formattedBody
            },
            ...(params.footerText
              ? {
                  footer: {
                    text: params.footerText.slice(0, 60)
                  }
                }
              : {}),
            action: {
              buttons: safeButtons
            }
          }
        }),
        cache: "no-store"
      }
    );

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return sendWhatsAppTextMessage({
        to: params.to,
        body: formattedBody,
        previewUrl: true
      });
    }

    return {
      sent: true,
      messageId: data.messages?.[0]?.id
    };
  } catch {
    return sendWhatsAppTextMessage({
      to: params.to,
      body: formattedBody,
      previewUrl: true
    });
  }
}

/**
 * Sends an Instagram DM or Facebook Messenger message via Meta Graph API.
 * Supports both:
 *   - Instagram Login tokens (`IG...` -> `https://graph.instagram.com/v22.0/me/messages`)
 *   - Unified / Facebook Login tokens (`EAA...` -> `https://graph.facebook.com/v25.0/me/messages`)
 *   - Product image attachments and interactive `quick_replies` tap buttons!
 */
export async function sendMetaSocialDirectMessage(params: {
  channel: "instagram" | "facebook";
  recipientId: string;
  body: string;
  images?: Array<{ url: string; caption?: string }>;
  buttons?: Array<{ id: string; title: string }>;
  commentId?: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const {
    accessToken: defaultMetaToken,
    instagramAccessToken,
    instagramAccountId,
    facebookPageAccessToken,
    facebookPageId,
    graphVersion
  } = getMetaWhatsAppConfig();

  const channelToken =
    params.channel === "instagram"
      ? instagramAccessToken || defaultMetaToken
      : facebookPageAccessToken || defaultMetaToken;

  const cleanRecipientId = params.recipientId
    .replace(/^@ig_/, "")
    .replace(/^fb\.me\//, "")
    .replace(/^@/, "")
    .trim();

  if (!cleanRecipientId || !channelToken) {
    return { sent: false, error: "Missing recipientId or access token" };
  }

  // Build candidate endpoints in priority order
  const endpoints =
    params.channel === "instagram"
      ? channelToken.startsWith("IG")
        ? [
            "https://graph.instagram.com/v22.0/me/messages",
            `https://graph.instagram.com/v22.0/${instagramAccountId}/messages`
          ]
        : [
            `https://graph.facebook.com/${graphVersion}/${instagramAccountId}/messages`,
            `https://graph.facebook.com/${graphVersion}/me/messages`,
            `https://graph.instagram.com/v22.0/${instagramAccountId}/messages`
          ]
      : [
          `https://graph.facebook.com/${graphVersion}/${facebookPageId}/messages`,
          `https://graph.facebook.com/${graphVersion}/me/messages`
        ];

  const primaryEndpoint = endpoints[0];
  const isIgDirectToken = primaryEndpoint.includes("graph.instagram.com");

  try {
    // 0. If triggered by an Instagram or Facebook Page comment, post a quick public reply + Private Reply DM via comment_id
    if (params.commentId) {
      const publicCommentEndpoint =
        params.channel === "instagram"
          ? `https://graph.facebook.com/${graphVersion}/${params.commentId}/replies`
          : `https://graph.facebook.com/${graphVersion}/${params.commentId}/comments`;
      await fetch(publicCommentEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message:
            "Just sent you our Coconut Shell Beachwear photos & 2-tap checkout options in your DMs! 🥥✨ Check your inbox!"
        }),
        cache: "no-store"
      }).catch(() => {});
    }

    // 1. Send product images first if provided (for direct DM recipients)
    if (params.images && params.images.length > 0 && !params.commentId) {
      for (const img of params.images) {
        await fetch(primaryEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channelToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipient: { id: cleanRecipientId },
            ...(isIgDirectToken ? {} : { messaging_type: "RESPONSE" }),
            message: {
              attachment: {
                type: "image",
                payload: {
                  url: img.url,
                  ...(isIgDirectToken ? {} : { is_reusable: true })
                }
              }
            }
          }),
          cache: "no-store"
        }).catch(() => {});
      }
    }

    // 2. Build message with optional Quick Reply tap buttons
    const quickReplies =
      params.buttons && params.buttons.length > 0
        ? params.buttons.slice(0, 13).map((b) => ({
            content_type: "text",
            title: b.title.trim().slice(0, 20),
            payload: b.id
          }))
        : undefined;

    let lastError = "";
    const recipientCandidates = params.commentId
      ? [{ comment_id: params.commentId }, { id: cleanRecipientId }]
      : [{ id: cleanRecipientId }];

    for (const recipientObj of recipientCandidates) {
      for (const endpoint of endpoints) {
        const isIgHost = endpoint.includes("graph.instagram.com");
        const isCommentReply = "comment_id" in recipientObj;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channelToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipient: recipientObj,
            ...(isIgHost || isCommentReply ? {} : { messaging_type: "RESPONSE" }),
            message: {
              text: formatWhatsAppMarkdown(params.body),
              ...(quickReplies && !isCommentReply
                ? { quick_replies: quickReplies }
                : {})
            }
          }),
          cache: "no-store"
        });

        const data = (await res.json()) as {
          message_id?: string;
          error?: { message?: string };
        };

        if (res.ok) {
          return {
            sent: true,
            messageId: data.message_id
          };
        }
        lastError =
          data.error?.message || `Meta ${params.channel} API HTTP ${res.status}`;
      }
    }

    return {
      sent: false,
      error: lastError
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Social DM API request failed"
    };
  }
}

/**
 * Sends an official Meta WhatsApp Template Message (`apoorva_order_confirmed`, `apoorva_shipping_update`, `apoorva_coastal_welcome`, or `hello_world`).
 * Works OUTSIDE the 24-hour customer service window (for website-only buyers, cold outbound initiation, or 24h+ follow-ups).
 */
export async function sendWhatsAppTemplateMessage(params: {
  to: string;
  templateName:
    | "apoorva_order_confirmed"
    | "apoorva_shipping_update"
    | "apoorva_coastal_welcome"
    | "hello_world";
  bodyParameters?: string[];
  languageCode?: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken, phoneNumberId, graphVersion } = getMetaWhatsAppConfig();
  const recipient = normalizeWhatsAppRecipient(params.to);

  if (!recipient || !accessToken) {
    return { sent: false, error: "Missing recipient or Meta access token" };
  }

  const components =
    params.bodyParameters && params.bodyParameters.length > 0
      ? [
          {
            type: "body",
            parameters: params.bodyParameters.map((val) => ({
              type: "text",
              text: String(val || "-").slice(0, 1000)
            }))
          }
        ]
      : undefined;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: params.templateName,
            language: {
              code: params.languageCode || "en_US"
            },
            ...(components ? { components } : {})
          }
        }),
        cache: "no-store"
      }
    );

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        sent: false,
        error:
          data.error?.message || `WhatsApp Template API HTTP ${res.status}`
      };
    }

    return {
      sent: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (err) {
    return {
      sent: false,
      error:
        err instanceof Error
          ? err.message
          : "WhatsApp template API request failed"
    };
  }
}

/**
 * Sends a dual-mode WhatsApp Order Confirmation Notification:
 *   1. Rich text confirmation (delivers immediately if inside a 24h chat window)
 *   2. Official `apoorva_order_confirmed` Utility Template (delivers even if customer bought directly on the website and never messaged WhatsApp first!)
 */
export async function sendWhatsAppOrderConfirmationNotification(params: {
  phone: string;
  customerName: string;
  orderId: string;
  itemsSummary: string;
  totalAmount: number;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const [textRes, tplRes] = await Promise.all([
    sendWhatsAppTextMessage({
      to: params.phone,
      body:
        `✅ *Payment Confirmed!* Thank you, *${params.customerName || "Valued Guest"}*! 🐚\n\n` +
        `Your *APOORVA SHELLS* order *#${params.orderId}* (*${params.itemsSummary}* • *₹${params.totalAmount.toLocaleString("en-IN")}*) is confirmed and being handcrafted at our Aluva, Kerala Atelier.\n\n` +
        `🚚 *Courier:* ${params.courierName}\n` +
        `📦 *AWB Tracking:* ${params.trackingNumber}\n` +
        `🔗 *Live Tracking:* ${params.trackingUrl}`,
      previewUrl: true
    }),
    sendWhatsAppTemplateMessage({
      to: params.phone,
      templateName: "apoorva_order_confirmed",
      bodyParameters: [
        params.customerName || "Valued Guest",
        params.orderId,
        params.itemsSummary || "APOORVA SHELLS Beachwear Set",
        params.totalAmount.toLocaleString("en-IN")
      ]
    })
  ]);

  return {
    sent: textRes.sent || tplRes.sent,
    messageId: tplRes.messageId || textRes.messageId,
    error: textRes.sent || tplRes.sent ? undefined : tplRes.error || textRes.error
  };
}

/**
 * Sends a dual-mode WhatsApp Shipping / Order Status Update Notification:
 *   1. Official `apoorva_shipping_update` Utility Template (works anytime, even days after order!)
 *   2. Rich text shipping update
 */
export async function sendWhatsAppShippingNotification(params: {
  phone: string;
  customerName: string;
  orderId: string;
  status: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const statusLabel = `${params.status.toUpperCase()} via ${params.courierName}`;
  const [tplRes, textRes] = await Promise.all([
    sendWhatsAppTemplateMessage({
      to: params.phone,
      templateName: "apoorva_shipping_update",
      bodyParameters: [
        params.customerName || "Valued Guest",
        params.orderId,
        statusLabel,
        params.trackingNumber || "Assigned at dispatch"
      ]
    }),
    sendWhatsAppTextMessage({
      to: params.phone,
      body:
        `📦 *APOORVA SHELLS Order Update (#${params.orderId})* 🌴\n\n` +
        `Hi *${params.customerName || "Valued Guest"}*, your order status is now *${params.status.toUpperCase()}*!\n\n` +
        `🚚 *Courier:* ${params.courierName}\n` +
        `🔖 *Tracking AWB:* ${params.trackingNumber}\n` +
        `🔗 *Track Live:* ${params.trackingUrl}`,
      previewUrl: true
    })
  ]);

  return {
    sent: tplRes.sent || textRes.sent,
    messageId: tplRes.messageId || textRes.messageId,
    error: tplRes.sent || textRes.sent ? undefined : tplRes.error || textRes.error
  };
}


