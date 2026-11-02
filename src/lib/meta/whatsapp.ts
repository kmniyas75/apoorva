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
            body: params.body
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
 * Sends an Instagram DM or Facebook Messenger message via Meta Graph API (`/{version}/me/messages`).
 */
export async function sendMetaSocialDirectMessage(params: {
  channel: "instagram" | "facebook";
  recipientId: string;
  body: string;
}): Promise<{
  sent: boolean;
  messageId?: string;
  error?: string;
}> {
  const { accessToken, graphVersion } = getMetaWhatsAppConfig();
  if (!params.recipientId || !accessToken) {
    return { sent: false, error: "Missing recipientId or Meta access token" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${graphVersion}/me/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: { id: params.recipientId },
          messaging_type: "RESPONSE",
          message: { text: params.body }
        }),
        cache: "no-store"
      }
    );

    const data = (await res.json()) as {
      message_id?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        sent: false,
        error: data.error?.message || `Meta ${params.channel} API HTTP ${res.status}`
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

