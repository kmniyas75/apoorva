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

// ============================================================================
// 1. VERCEL BLOB (1-Click Inside Vercel Dashboard • No Credit Card Needed)
// ============================================================================
export function isVercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadToVercelBlob(params: {
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; providerLabel: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set");

  const res = await fetch(
    `https://blob.vercel-storage.com/uploads/${encodeURIComponent(params.fileName)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-version": "7",
        "x-content-type": params.contentType,
        "x-add-random-suffix": "0"
      },
      body: new Uint8Array(params.buffer)
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Vercel Blob upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { url: string };
  return {
    publicUrl: data.url,
    providerLabel: "Vercel Blob CDN"
  };
}

export async function deleteFromVercelBlob(url: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !url.includes(".vercel-storage.com")) return false;

  const res = await fetch("https://blob.vercel-storage.com/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-version": "7",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ urls: [url] })
  });

  return res.ok;
}

// ============================================================================
// 2. CLOUDINARY (25 GB Free • Instant Google/GitHub Signup • No Card Needed)
// ============================================================================
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadToCloudinary(params: {
  fileName: string;
  buffer: Buffer;
  contentType: string;
  isVideo: boolean;
}): Promise<{ publicUrl: string; publicId: string; providerLabel: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "apoorva";
  const publicId = params.fileName.replace(/\.[^/.]+$/, "");
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  const base64Data = `data:${params.contentType};base64,${params.buffer.toString("base64")}`;
  const form = new FormData();
  form.append("file", base64Data);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const resourceType = params.isVideo ? "video" : "image";
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: form
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { secure_url: string; public_id: string };
  return {
    publicUrl: data.secure_url,
    publicId: data.public_id,
    providerLabel: `Cloudinary (${cloudName})`
  };
}

export async function deleteFromCloudinary(
  url: string,
  diskPath?: string,
  isVideo?: boolean
): Promise<boolean> {
  if (!isCloudinaryConfigured() || !url.includes("res.cloudinary.com")) {
    return false;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const publicId =
    diskPath && diskPath.startsWith("apoorva/")
      ? diskPath
      : `apoorva/${(url.split("/").pop() || "").replace(/\.[^/.]+$/, "")}`;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const resourceType =
    isVideo || url.includes("/video/upload/") ? "video" : "image";
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      body: form
    }
  );

  return res.ok;
}

// ============================================================================
// 3. SUPABASE STORAGE (1 GB Free • Instant GitHub Login • No Card Needed)
// ============================================================================
export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function uploadToSupabaseStorage(params: {
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; objectKey: string; providerLabel: string }> {
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_BUCKET || "apoorva-media";
  const objectKey = `uploads/${params.fileName}`;

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectKey}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": params.contentType,
        "x-upsert": "true"
      },
      body: new Uint8Array(params.buffer)
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${res.status}): ${errText}`);
  }

  return {
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectKey}`,
    objectKey,
    providerLabel: `Supabase (${bucket})`
  };
}

export async function deleteFromSupabaseStorage(
  url: string,
  diskPath?: string
): Promise<boolean> {
  if (!isSupabaseStorageConfigured() || !url.includes("/storage/v1/object/")) {
    return false;
  }
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_BUCKET || "apoorva-media";
  const objectKey =
    diskPath && diskPath.startsWith("uploads/")
      ? diskPath
      : `uploads/${url.split("/").pop() || ""}`;

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectKey}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey
      }
    }
  );

  return res.ok;
}

// ============================================================================
// 4. ORACLE CLOUD (OCI) / S3-COMPATIBLE OBJECT STORAGE
// ============================================================================
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
