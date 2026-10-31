import { NextResponse } from "next/server";

export async function POST() {
  const confirmationCode = `APV-DEL-${Date.now().toString().slice(-6)}`;
  const siteUrl =
    process.env.SITE_URL || "https://apoorva-eight.vercel.app";

  return NextResponse.json({
    url: `${siteUrl}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode
  });
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    appId: process.env.META_APP_ID || "1063008853460924",
    businessId: process.env.META_BUSINESS_ID || "1678860643969539",
    contactEmail: process.env.META_CONTACT_EMAIL || "apoorvacoastal@gmail.com",
    instructionsUrl: "https://apoorva-eight.vercel.app/data-deletion"
  });
}
