const DEFAULT_META_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBS7ZBGcseYFElhA2BiVrZCS0poQZArCUgj8OyW6CigfA8qqqpTBTEyXvGKBM6K6TGeMpyBFA4hzWd35QzbPLKNiVrZAb055Yttu1VLLst7dX5LA27QoYMlzHeG7D9F8RwDGNK7ww72POcfCZArLk65eLgbefm3sifcHPhZCXcwbG3bT1JAOGTI5zwZDZD",
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

  const phoneNumberId =
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID) || "1332497489956818";

  const wabaId =
    cleanEnv(process.env.WHATSAPP_WABA_ID) || "1978745913089125";

  const testNumber =
    cleanEnv(process.env.WHATSAPP_TEST_NUMBER) || "+91 73064 09010";

  const graphVersion = cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";

  return {
    accessToken,
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
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken: defaultMetaToken, graphVersion } = getMetaWhatsAppConfig();
  const channelToken =
    params.channel === "instagram"
      ? cleanEnv(process.env.INSTAGRAM_ACCESS_TOKEN) || defaultMetaToken
      : cleanEnv(process.env.FACEBOOK_PAGE_ACCESS_TOKEN) || defaultMetaToken;

  const cleanRecipientId = params.recipientId
    .replace(/^@ig_/, "")
    .replace(/^fb\.me\//, "")
    .replace(/^@/, "")
    .trim();

  if (!cleanRecipientId || !channelToken) {
    return { sent: false, error: "Missing recipientId or access token" };
  }

  // Instagram tokens starting with "IG" use graph.instagram.com; "EAA" tokens use graph.facebook.com
  const isIgDirectToken =
    params.channel === "instagram" && channelToken.startsWith("IG");
  const baseEndpoint = isIgDirectToken
    ? "https://graph.instagram.com/v22.0/me/messages"
    : `https://graph.facebook.com/${graphVersion}/me/messages`;

  try {
    // 1. Send product images first if provided
    if (params.images && params.images.length > 0) {
      for (const img of params.images) {
        await fetch(baseEndpoint, {
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

    const res = await fetch(baseEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient: { id: cleanRecipientId },
        ...(isIgDirectToken ? {} : { messaging_type: "RESPONSE" }),
        message: {
          text: formatWhatsAppMarkdown(params.body),
          ...(quickReplies ? { quick_replies: quickReplies } : {})
        }
      }),
      cache: "no-store"
    });

    const data = (await res.json()) as {
      message_id?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        sent: false,
        error:
          data.error?.message || `Meta ${params.channel} API HTTP ${res.status}`
      };
    }

    return {
      sent: true,
      messageId: data.message_id
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Social DM API request failed"
    };
  }
}

