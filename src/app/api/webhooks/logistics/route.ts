export { POST } from "../shiprocket/route";

export async function GET() {
  return Response.json({ status: "ok", endpoint: "logistics-webhook" });
}

