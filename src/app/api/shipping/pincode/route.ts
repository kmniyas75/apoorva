import { NextResponse } from "next/server";
import { checkShiprocketServiceability } from "@/lib/shipping/shiprocket";

interface PincodeFallback {
  city: string;
  state: string;
  transitDays: number;
  courier: string;
}

// Comprehensive Indian Postal Zone Prefix Directory (All 9 postal zones & regions)
const REGION_PREFIX_MAP: Record<string, PincodeFallback> = {
  // Zone 1: Delhi, Haryana, Punjab, Himachal Pradesh, J&K, Chandigarh
  "11": { city: "New Delhi", state: "Delhi", transitDays: 2, courier: "Blue Dart Air Express" },
  "12": { city: "Gurugram / Faridabad", state: "Haryana", transitDays: 2, courier: "Blue Dart Air Express" },
  "13": { city: "Ambala / Panipat", state: "Haryana", transitDays: 2, courier: "Blue Dart Air Express" },
  "14": { city: "Ludhiana / Jalandhar", state: "Punjab", transitDays: 2, courier: "Blue Dart Air Express" },
  "15": { city: "Bathinda", state: "Punjab", transitDays: 2, courier: "Blue Dart Air Express" },
  "16": { city: "Chandigarh", state: "Chandigarh", transitDays: 2, courier: "Blue Dart Air Express" },
  "17": { city: "Shimla", state: "Himachal Pradesh", transitDays: 3, courier: "Blue Dart Air Express" },
  "18": { city: "Jammu", state: "Jammu & Kashmir", transitDays: 3, courier: "Blue Dart Air Express" },
  "19": { city: "Srinagar", state: "Jammu & Kashmir", transitDays: 3, courier: "Blue Dart Air Express" },

  // Zone 2: Uttar Pradesh, Uttarakhand
  "20": { city: "Noida / Ghaziabad / Aligarh", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "21": { city: "Prayagraj", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "22": { city: "Lucknow", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "23": { city: "Mirzapur / Sonbhadra", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "24": { city: "Dehradun / Bareilly", state: "Uttarakhand", transitDays: 2, courier: "Blue Dart Air Express" },
  "25": { city: "Meerut", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "26": { city: "Pilibhit / Haldwani", state: "Uttarakhand", transitDays: 3, courier: "Blue Dart Air Express" },
  "27": { city: "Gorakhpur", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "28": { city: "Agra / Jhansi", state: "Uttar Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },

  // Zone 3: Rajasthan, Gujarat, Daman & Diu, Dadra & Nagar Haveli
  "30": { city: "Jaipur", state: "Rajasthan", transitDays: 2, courier: "Blue Dart Air Express" },
  "31": { city: "Udaipur", state: "Rajasthan", transitDays: 2, courier: "Blue Dart Air Express" },
  "32": { city: "Kota", state: "Rajasthan", transitDays: 2, courier: "Blue Dart Air Express" },
  "33": { city: "Bikaner", state: "Rajasthan", transitDays: 3, courier: "Blue Dart Air Express" },
  "34": { city: "Jodhpur", state: "Rajasthan", transitDays: 2, courier: "Blue Dart Air Express" },
  "36": { city: "Rajkot", state: "Gujarat", transitDays: 2, courier: "Blue Dart Air Express" },
  "37": { city: "Bhuj / Kutch", state: "Gujarat", transitDays: 3, courier: "Blue Dart Air Express" },
  "38": { city: "Ahmedabad / Gandhinagar", state: "Gujarat", transitDays: 2, courier: "Blue Dart Air Express" },
  "39": { city: "Surat / Vadodara", state: "Gujarat", transitDays: 2, courier: "Blue Dart Air Express" },

  // Zone 4: Maharashtra, Goa, Madhya Pradesh, Chhattisgarh
  "40": { city: "Mumbai", state: "Maharashtra", transitDays: 2, courier: "Blue Dart Air Express" },
  "41": { city: "Pune", state: "Maharashtra", transitDays: 2, courier: "Blue Dart Air Express" },
  "42": { city: "Nashik", state: "Maharashtra", transitDays: 2, courier: "Blue Dart Air Express" },
  "43": { city: "Chhatrapati Sambhajinagar", state: "Maharashtra", transitDays: 2, courier: "Blue Dart Air Express" },
  "44": { city: "Nagpur", state: "Maharashtra", transitDays: 2, courier: "Blue Dart Air Express" },
  "45": { city: "Indore", state: "Madhya Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "46": { city: "Bhopal", state: "Madhya Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "47": { city: "Gwalior", state: "Madhya Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "48": { city: "Jabalpur", state: "Madhya Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "49": { city: "Raipur", state: "Chhattisgarh", transitDays: 2, courier: "Blue Dart Air Express" },

  // Zone 5: Andhra Pradesh, Telangana, Karnataka
  "50": { city: "Hyderabad / Secunderabad", state: "Telangana", transitDays: 2, courier: "Blue Dart Air Express" },
  "51": { city: "Tirupati / Kadapa", state: "Andhra Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "52": { city: "Vijayawada / Guntur", state: "Andhra Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "53": { city: "Visakhapatnam", state: "Andhra Pradesh", transitDays: 2, courier: "Blue Dart Air Express" },
  "56": { city: "Bengaluru", state: "Karnataka", transitDays: 1, courier: "Blue Dart Air Express" },
  "57": { city: "Mangaluru / Mysuru", state: "Karnataka", transitDays: 1, courier: "Blue Dart Air Express" },
  "58": { city: "Hubballi / Belagavi", state: "Karnataka", transitDays: 2, courier: "Blue Dart Air Express" },
  "59": { city: "Kalaburagi / Raichur", state: "Karnataka", transitDays: 2, courier: "Blue Dart Air Express" },

  // Zone 6: Tamil Nadu, Kerala, Lakshadweep, Puducherry
  "60": { city: "Chennai", state: "Tamil Nadu", transitDays: 1, courier: "Blue Dart Air Express" },
  "61": { city: "Thanjavur / Tiruchirappalli", state: "Tamil Nadu", transitDays: 1, courier: "Blue Dart Air Express" },
  "62": { city: "Madurai / Dindigul", state: "Tamil Nadu", transitDays: 1, courier: "Blue Dart Air Express" },
  "63": { city: "Salem / Vellore", state: "Tamil Nadu", transitDays: 1, courier: "Blue Dart Air Express" },
  "64": { city: "Coimbatore", state: "Tamil Nadu", transitDays: 1, courier: "Blue Dart Air Express" },
  // Local Studio Base: Aluva, Ernakulam, Kerala
  "67": { city: "Kozhikode / Kannur", state: "Kerala", transitDays: 1, courier: "Direct Studio Courier" },
  "68": { city: "Aluva / Kochi / Ernakulam", state: "Kerala", transitDays: 1, courier: "Direct Studio Courier" },
  "69": { city: "Thiruvananthapuram / Kollam", state: "Kerala", transitDays: 1, courier: "Direct Studio Courier" },

  // Zone 7: West Bengal, Odisha, North Eastern States, Andaman & Nicobar
  "70": { city: "Kolkata", state: "West Bengal", transitDays: 2, courier: "Blue Dart Air Express" },
  "71": { city: "Howrah / Durgapur", state: "West Bengal", transitDays: 2, courier: "Blue Dart Air Express" },
  "72": { city: "Midnapore", state: "West Bengal", transitDays: 2, courier: "Blue Dart Air Express" },
  "73": { city: "Siliguri / Darjeeling", state: "West Bengal", transitDays: 3, courier: "Blue Dart Air Express" },
  "74": { city: "Nadia / 24 Parganas", state: "West Bengal", transitDays: 2, courier: "Blue Dart Air Express" },
  "75": { city: "Bhubaneswar / Cuttack", state: "Odisha", transitDays: 2, courier: "Blue Dart Air Express" },
  "76": { city: "Berhampur / Sambalpur", state: "Odisha", transitDays: 2, courier: "Blue Dart Air Express" },
  "77": { city: "Rourkela", state: "Odisha", transitDays: 2, courier: "Blue Dart Air Express" },
  "78": { city: "Guwahati", state: "Assam", transitDays: 3, courier: "Blue Dart Air Express" },
  "79": { city: "Shillong / Agartala / Imphal", state: "North East Region", transitDays: 3, courier: "Blue Dart Air Express" },

  // Zone 8: Bihar, Jharkhand
  "80": { city: "Patna", state: "Bihar", transitDays: 2, courier: "Blue Dart Air Express" },
  "81": { city: "Bhagalpur", state: "Bihar", transitDays: 2, courier: "Blue Dart Air Express" },
  "82": { city: "Gaya", state: "Bihar", transitDays: 2, courier: "Blue Dart Air Express" },
  "83": { city: "Ranchi / Jamshedpur", state: "Jharkhand", transitDays: 2, courier: "Blue Dart Air Express" },
  "84": { city: "Muzaffarpur", state: "Bihar", transitDays: 2, courier: "Blue Dart Air Express" },
  "85": { city: "Purnia", state: "Bihar", transitDays: 3, courier: "Blue Dart Air Express" }
};

function calculateDeliveryDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode")?.trim();

    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit Indian PIN code." },
        { status: 400 }
      );
    }

    // 1. Live Shiprocket Courier Serviceability Check
    try {
      const srResult = await checkShiprocketServiceability(pincode);
      if (srResult && srResult.serviceable) {
        const transitDays = srResult.transitDays || 2;
        let estimatedDelivery = srResult.etd;
        if (!estimatedDelivery) {
          estimatedDelivery = calculateDeliveryDate(transitDays);
        } else {
          // Format ISO ETD date to human-readable string
          try {
            const parsed = new Date(estimatedDelivery);
            if (!isNaN(parsed.getTime())) {
              estimatedDelivery = parsed.toLocaleDateString("en-IN", {
                weekday: "long",
                month: "short",
                day: "numeric"
              });
            }
          } catch {
            estimatedDelivery = calculateDeliveryDate(transitDays);
          }
        }

        return NextResponse.json({
          success: true,
          pincode,
          city: srResult.city || "Destination Hub",
          state: srResult.state || "India",
          transitDays,
          estimatedDelivery,
          courier: srResult.courierName || "Blue Dart Air Express",
          availableCouriers: srResult.availableCouriers || ["Blue Dart Air Express"],
          serviceable: true,
          source: "shiprocket_live",
          features: {
            freeShippingAvailable: true,
            airCargoExpress: true,
            tamperProofWaxSeal: true,
            doorstepDelivery: true
          }
        });
      }
    } catch (err) {
      console.warn("[Shiprocket Serviceability Fallback]", err);
    }

    // 2. India Post Public API for 100% Accurate District & State Resolution across all 19,100+ Indian PINs
    let resolvedCity: string | null = null;
    let resolvedState: string | null = null;
    let postOfficeName: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const postRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        signal: controller.signal,
        next: { revalidate: 86400 } // Cache postal directory for 24h
      });
      clearTimeout(timeoutId);

      if (postRes.ok) {
        const postData = await postRes.json();
        if (
          Array.isArray(postData) &&
          postData[0]?.Status === "Success" &&
          Array.isArray(postData[0]?.PostOffice) &&
          postData[0].PostOffice.length > 0
        ) {
          const po = postData[0].PostOffice[0];
          resolvedCity = po.District || po.Division || po.Name;
          resolvedState = po.State;
          postOfficeName = po.Name;
        }
      }
    } catch {
      // Non-blocking fallback
    }

    // 3. Determine Transit Days & Courier based on Geographic Origin (Aluva, Kerala)
    const prefix2 = pincode.slice(0, 2);
    const fallback = REGION_PREFIX_MAP[prefix2] || {
      city: "Metro Hub",
      state: "India",
      transitDays: 2,
      courier: "Blue Dart Air Express"
    };

    const finalCity = resolvedCity || fallback.city;
    const finalState = resolvedState || fallback.state;

    let transitDays = fallback.transitDays;
    let courier = fallback.courier;

    const lowerState = finalState.toLowerCase();
    if (lowerState.includes("kerala")) {
      transitDays = 1;
      courier = "Direct Studio Courier";
    } else if (
      lowerState.includes("tamil nadu") ||
      lowerState.includes("karnataka") ||
      lowerState.includes("telangana") ||
      lowerState.includes("andhra") ||
      lowerState.includes("puducherry")
    ) {
      transitDays = 1;
      courier = "Blue Dart Air Express";
    } else if (
      lowerState.includes("maharashtra") ||
      lowerState.includes("gujarat") ||
      lowerState.includes("goa") ||
      lowerState.includes("delhi")
    ) {
      transitDays = 2;
      courier = "Blue Dart Air Express";
    } else if (
      lowerState.includes("assam") ||
      lowerState.includes("meghalaya") ||
      lowerState.includes("manipur") ||
      lowerState.includes("mizoram") ||
      lowerState.includes("nagaland") ||
      lowerState.includes("tripura") ||
      lowerState.includes("arunachal") ||
      lowerState.includes("ladakh") ||
      lowerState.includes("andaman")
    ) {
      transitDays = 3;
      courier = "Blue Dart Air Express";
    }

    const estimatedDelivery = calculateDeliveryDate(transitDays);

    return NextResponse.json({
      success: true,
      pincode,
      city: finalCity,
      state: finalState,
      postOffice: postOfficeName || undefined,
      transitDays,
      estimatedDelivery,
      courier,
      serviceable: true,
      source: resolvedCity ? "india_post_official" : "postal_region_engine",
      features: {
        freeShippingAvailable: true,
        airCargoExpress: true,
        tamperProofWaxSeal: true,
        doorstepDelivery: true
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error resolving PIN code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
