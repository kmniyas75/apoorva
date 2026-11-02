const DEFAULT_META_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBS7ZBGcseYFElhA2BiVrZCS0poQZArCUgj8OyW6CigfA8qqqpTBTEyXvGKBM6K6TGeMpyBFA4hzWd35QzbPLKNiVrZAb055Yttu1VLLst7dX5LA27QoYMlzHeG7D9F8RwDGNK7ww72POcfCZArLk65eLgbefm3sifcHPhZCXcwbG3bT1JAOGTI5zwZDZD",
  "utf8"
).toString("base64");

const DEFAULT_IG_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBS6hFnTSj8AYcmiutIRpGFSr3SfqbZCLwHbEqtgjZAaxt1VZA4hEkRZBuS1MZBCQ0JzYJ2o4Boge4h7hQdZAZCzdnbzKCHTqqWqoiLg2elgpbecxMyn8ZCT2agvYrJXZAT0e3pvOCmY5PxtZClsZCGDe8YnO9noMYdYZCfVvaUhwgYkXorQ8OWreGKcftw7hX4Kzl2ZBOZBW1ZA1ZABNEdmC98jzKBOQNWLMatPqYPTuEWv88xN3ktQZDZD",
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
    graphVersion
  } = getMetaWhatsAppConfig();

  const channelToken =
    params.channel === "instagram"
      ? instagramAccessToken || defaultMetaToken
      : cleanEnv(process.env.FACEBOOK_PAGE_ACCESS_TOKEN) || defaultMetaToken;

  const cleanRecipientId = params.recipientId
    .replace(/^@ig_/, "")
    .replace(/^fb\.me\//, "")
    .replace(/^@/, "")
    .trim();

  if (!cleanRecipientId || !channelToken) {
    return { sent: false, error: "Missing recipientId or access token" };
  }

  // Build candidate endpoints in priority order (Unified Login IG_ID -> /me/messages -> graph.instagram.com)
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
      : [`https://graph.facebook.com/${graphVersion}/me/messages`];

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

