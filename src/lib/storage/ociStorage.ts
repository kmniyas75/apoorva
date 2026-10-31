import crypto from "crypto";

export interface OciStorageConfig {
  enabled: boolean;
  namespace: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  customEndpoint?: string;
  publicBaseUrl?: string;
}

export function getOciStorageConfig(): OciStorageConfig {
  const namespace = process.env.OCI_NAMESPACE || "";
  const region = process.env.OCI_REGION || "ap-hyderabad-1";
  const bucket = process.env.OCI_BUCKET_NAME || "";
  const accessKeyId = process.env.OCI_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.OCI_SECRET_ACCESS_KEY || "";
  const customEndpoint = process.env.OCI_S3_ENDPOINT || "";
  const publicBaseUrl = process.env.OCI_PUBLIC_BASE_URL || "";

  const enabled = Boolean(
    namespace && region && bucket && accessKeyId && secretAccessKey
  );

  return {
    enabled,
    namespace,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    customEndpoint,
    publicBaseUrl
  };
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, "aws4_request");
}

/**
 * Uploads a file buffer to Oracle Cloud Infrastructure (OCI) Always Free Object Storage
 * using OCI's S3-compatible API and AWS Signature V4.
 */
export async function uploadToOciObjectStorage(params: {
  objectKey: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; objectKey: string }> {
  const cfg = getOciStorageConfig();
  if (!cfg.enabled) {
    throw new Error("OCI Object Storage environment variables are not configured.");
  }

  const host = cfg.customEndpoint
    ? new URL(cfg.customEndpoint).host
    : `${cfg.namespace}.compat.objectstorage.${cfg.region}.oraclecloud.com`;

  const encodedKey = params.objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const canonicalUri = `/${encodeURIComponent(cfg.bucket)}/${encodedKey}`;
  const endpointUrl = `https://${host}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(params.buffer);

  const canonicalHeaders =
    `content-type:${params.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey(
    cfg.secretAccessKey,
    dateStamp,
    cfg.region,
    "s3"
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpointUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader
    },
    body: new Uint8Array(params.buffer)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OCI Object Storage PUT failed (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/${encodedKey}`
    : `https://objectstorage.${cfg.region}.oraclecloud.com/n/${encodeURIComponent(
        cfg.namespace
      )}/b/${encodeURIComponent(cfg.bucket)}/o/${encodedKey}`;

  return {
    publicUrl,
    objectKey: params.objectKey
  };
}

/**
 * Deletes an object from Oracle Cloud Infrastructure (OCI) Object Storage
 * using OCI's S3-compatible API and AWS Signature V4.
 */
export async function deleteFromOciObjectStorage(
  objectKeyOrUrl: string
): Promise<boolean> {
  const cfg = getOciStorageConfig();
  if (!cfg.enabled) return false;

  let objectKey = objectKeyOrUrl;
  const ociPrefix = `/b/${cfg.bucket}/o/`;
  if (objectKeyOrUrl.includes(ociPrefix)) {
    objectKey = decodeURIComponent(objectKeyOrUrl.split(ociPrefix)[1] || "");
  } else if (
    cfg.publicBaseUrl &&
    objectKeyOrUrl.startsWith(cfg.publicBaseUrl)
  ) {
    objectKey = objectKeyOrUrl
      .slice(cfg.publicBaseUrl.replace(/\/$/, "").length + 1)
      .trim();
  }

  if (!objectKey) return false;

  const host = cfg.customEndpoint
    ? new URL(cfg.customEndpoint).host
    : `${cfg.namespace}.compat.objectstorage.${cfg.region}.oraclecloud.com`;

  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const canonicalUri = `/${encodeURIComponent(cfg.bucket)}/${encodedKey}`;
  const endpointUrl = `https://${host}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const emptyPayloadHash = sha256Hex("");

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${emptyPayloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "DELETE",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    emptyPayloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey(
    cfg.secretAccessKey,
    dateStamp,
    cfg.region,
    "s3"
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpointUrl, {
    method: "DELETE",
    headers: {
      "x-amz-content-sha256": emptyPayloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader
    }
  });

  return res.ok || res.status === 204 || res.status === 404;
}
