const DEFAULT_META_TOKEN_B64 = Buffer.from(
  "EAAPGzQkah7wBSZChwEI5M5OHx0uogNZB4q4tzsmDraQgdzcvhpZC3p9x2ht0vjbCqeGX2XZBfNubFZBiotqcnjTkfePMJS3PspuSmbDutW8zQzHnYxSRhS0K2OUYWCOZA1Pef90ZCMyEgS9Q7ZAzUQ2ixw23TTANZC5KtoTyJM9BbmXtSeOT3hsK1Fsno2WZC1n4LEQbD0ir9me1EiMd6zYwdXAeQ6TFdQkUHkuxtT40lzIxTZCyZBZBNNFlakoVTT0DIZChkppyPvUKaApgjdZAUzmKB2swrYougZDZD",
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
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID) || "1388810254321373";

  const wabaId =
    cleanEnv(process.env.WHATSAPP_WABA_ID) || "1148169414230154";

  const testNumber =
    cleanEnv(process.env.WHATSAPP_TEST_NUMBER) || "+1 (555) 649-2993";

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
