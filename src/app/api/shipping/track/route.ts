import { NextResponse } from "next/server";
import { fetchTrackingInfo, saveTrackingRecord, generateTrackingData } from "@/lib/shipping/trackingService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query =
      searchParams.get("query") ||
      searchParams.get("trackingNumber") ||
      searchParams.get("orderId") ||
      "APV-89421";

    const trackingRecord = await fetchTrackingInfo(query);

    return NextResponse.json({
      success: true,
      query,
      data: trackingRecord
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error querying shipment tracking API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      trackingNumber,
      destinationCity = "Mumbai",
      destinationState = "Maharashtra",
      destinationPincode = "400006",
      recipientName = "Ananya Deshmukh"
    } = body;

    const queryKey = trackingNumber || orderId || "APV-89421";
    const trackingRecord = generateTrackingData(
      queryKey,
      destinationCity,
      destinationState,
      destinationPincode,
      recipientName
    );

    saveTrackingRecord(trackingRecord);

    return NextResponse.json({
      success: true,
      message: "Shipment tracking updated.",
      data: trackingRecord
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating tracking record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
