/**
 * SHIPROCKET LOGISTICS ENGINE
 * 
 * Flow:
 * 1. authenticateShiprocket() -> returns auth token (valid for 10 days)
 * 2. createShiprocketOrder(order) -> creates order in Shiprocket system
 * 3. assignCourierAndGenerateAwb(shipmentId) -> auto-assigns Blue Dart / fastest courier & returns AWB
 * 4. generatePickup(shipmentId) -> schedules rider pickup at Aluva, Kerala studio
 * 5. trackShiprocketAwb(awb) -> returns live real-time carrier scans
 */

interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
}

interface ShiprocketOrderPayload {
  order_id: string;
  order_date: string;
  pickup_location: string; // configured pickup address nickname in Shiprocket dashboard (e.g. "Aluva Atelier")
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number; // in cm
  breadth: number; // in cm
  height: number; // in cm
  weight: number; // in kg
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * 1. Authenticate with Shiprocket API using email and password
 */
export async function getShiprocketAuthToken(): Promise<string | null> {
  // If static token is provided in .env
  if (process.env.SHIPROCKET_API_TOKEN && process.env.SHIPROCKET_API_TOKEN !== "your_shiprocket_api_token_here") {
    return process.env.SHIPROCKET_API_TOKEN;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    return null; // Sandbox fallback
  }

  // Check cache
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      console.warn("[Shiprocket Auth Failed]", await res.text());
      return null;
    }

    const data = await res.json();
    cachedToken = data.token;
    tokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000; // cache for 8 days
    return cachedToken;
  } catch (err) {
    console.error("[Shiprocket Auth Error]", err);
    return null;
  }
}

/**
 * 2. Create Order in Shiprocket upon payment success
 */
export async function createShiprocketOrder(payload: ShiprocketOrderPayload): Promise<{
  success: boolean;
  orderId?: number;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  isSimulated: boolean;
}> {
  const token = await getShiprocketAuthToken();

  // If live credentials are not set, return simulated Shiprocket response
  if (!token) {
    const simShipmentId = Math.floor(1000000 + Math.random() * 9000000);
    const simAwb = `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`;
    return {
      success: true,
      orderId: Math.floor(100000 + Math.random() * 900000),
      shipmentId: simShipmentId,
      awbCode: simAwb,
      courierName: "Blue Dart Express",
      isSimulated: true
    };
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.shipment_id) {
      throw new Error(data.message || "Failed to create order on Shiprocket");
    }

    // Auto-request AWB assignment
    let awbCode: string | undefined = data.awb_code;
    let courierName: string = data.courier_name || "Blue Dart Express";

    if (!awbCode && data.shipment_id) {
      const awbRes = await assignShiprocketAwb(data.shipment_id, token);
      if (awbRes.awbCode) {
        awbCode = awbRes.awbCode;
        courierName = awbRes.courierName || courierName;
      }
    }

    return {
      success: true,
      orderId: data.order_id,
      shipmentId: data.shipment_id,
      awbCode,
      courierName,
      isSimulated: false
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Shiprocket Order Creation Error]", msg);
    return {
      success: false,
      isSimulated: false
    };
  }
}

/**
 * 3. Assign courier (Blue Dart/Delhivery) and generate AWB code
 */
export async function assignShiprocketAwb(
  shipmentId: number,
  token: string
): Promise<{ awbCode?: string; courierName?: string }> {
  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ shipment_id: shipmentId })
    });

    const data = await res.json();
    return {
      awbCode: data?.response?.data?.awb_code,
      courierName: data?.response?.data?.courier_name
    };
  } catch (err) {
    console.error("[Assign AWB Error]", err);
    return {};
  }
}

/**
 * 4. Request Pickup from Atelier Studio
 */
export async function requestShiprocketPickup(
  shipmentId: number,
  token: string
): Promise<boolean> {
  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/pickup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ shipment_id: [shipmentId] })
    });

    return res.ok;
  } catch (err) {
    console.error("[Request Pickup Error]", err);
    return false;
  }
}

export interface ShiprocketServiceabilityResult {
  serviceable: boolean;
  courierName?: string;
  city?: string;
  state?: string;
  etd?: string;
  transitDays?: number;
  availableCouriers?: string[];
  isLive: boolean;
}

/**
 * 5. Check real-time Courier Serviceability via Shiprocket API
 */
export async function checkShiprocketServiceability(
  deliveryPincode: string,
  pickupPincode = "688001",
  weight = 0.65
): Promise<ShiprocketServiceabilityResult | null> {
  const token = await getShiprocketAuthToken();
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability?pickup_postcode=${encodeURIComponent(
      pickupPincode
    )}&delivery_postcode=${encodeURIComponent(deliveryPincode)}&weight=${weight}&cod=0`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const couriers = data?.data?.available_courier_companies;

    if (Array.isArray(couriers) && couriers.length > 0) {
      // Prioritize Blue Dart Air Express if available
      interface SRCompany {
        courier_name?: string;
        city?: string;
        state?: string;
        etd?: string;
        estimated_delivery_days?: string | number;
        rating?: number;
      }

      const blueDart = couriers.find((c: SRCompany) =>
        c.courier_name?.toLowerCase().includes("blue dart")
      );
      const chosen: SRCompany = blueDart || couriers[0];

      let transitDays = 2;
      if (chosen.estimated_delivery_days) {
        const parsed = parseInt(String(chosen.estimated_delivery_days), 10);
        if (!isNaN(parsed) && parsed > 0) transitDays = parsed;
      }

      const availableNames = couriers
        .map((c: SRCompany) => c.courier_name)
        .filter((name): name is string => typeof name === "string");

      return {
        serviceable: true,
        courierName: chosen.courier_name || "Blue Dart Air Express",
        city: chosen.city || undefined,
        state: chosen.state || undefined,
        etd: chosen.etd || undefined,
        transitDays,
        availableCouriers: availableNames,
        isLive: true
      };
    }

    return {
      serviceable: false,
      isLive: true
    };
  } catch (err) {
    console.error("[Shiprocket Serviceability Check Error]", err);
    return null;
  }
}

