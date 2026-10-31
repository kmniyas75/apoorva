import fs from "fs";
import path from "path";
import {
  PRODUCTS,
  BEACH_MOMENTS,
  Product,
  BeachMoment
} from "@/data/products";
import { OrderRecord } from "@/lib/types/checkout";
import {
  generateTrackingData,
  saveTrackingRecord
} from "@/lib/shipping/trackingService";
import {
  saveDatabaseToCloudinary,
  loadDatabaseFromCloudinary
} from "@/lib/storage/ociStorage";
import {
  loadStoreFromMongoDB,
  saveStoreToMongoDB
} from "@/lib/db/mongodb";

export interface StoreSettings {
  capsuleTitle: string;
  bundleDiscountPercent: number;
  enableCod: boolean;
  enableUpi: boolean;
  freeShipping: boolean;
  supportEmail: string;
  supportPhone: string;
  orbitSpeedMultiplier: number;
  orbitRadiusMultiplier?: number;
  adminPassword?: string;
}

export interface SocialAutomationConfig {
  whatsappEnabled: boolean;
  whatsappBusinessNumber: string;
  whatsappPhoneId: string;
  whatsappAutoConfirmCod: boolean;
  whatsappWelcomeTemplate: string;
  instagramEnabled: boolean;
  instagramHandle: string;
  instagramTriggerKeywords: string[];
  instagramDmReplyTemplate: string;
  webhookVerifyToken: string;
}

export interface SocialAutomationEvent {
  id: string;
  channel: "whatsapp" | "instagram";
  senderHandleOrPhone: string;
  senderName: string;
  incomingMessage: string;
  automatedReply: string;
  detectedIntent: "order_created" | "catalog_sent" | "payment_link_sent";
  orderId?: string;
  amount?: number;
  timestamp: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  type: "image" | "video";
  category: "cutout" | "lifestyle" | "video" | "brand" | "upload";
  folder: string;
  diskPath: string;
  sizeKB?: number;
  createdAt: string;
}

export interface StoragePathsInfo {
  workspaceRoot: string;
  builtInImagesDir: string;
  builtInVideosDir: string;
  adminUploadsDir: string;
  databaseJsonFile: string;
}

export interface StoreDatabase {
  products: Product[];
  beachMoments: BeachMoment[];
  settings: StoreSettings;
  socialAutomation: SocialAutomationConfig;
  socialEvents: SocialAutomationEvent[];
  orders: OrderRecord[];
  customMedia: MediaAsset[];
  deletedMediaUrls?: string[];
  updatedAt: string;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "store-db.json");

export function getStoragePathsInfo(): StoragePathsInfo {
  const root = process.cwd();
  return {
    workspaceRoot: root,
    builtInImagesDir: path.join(root, "public", "images"),
    builtInVideosDir: path.join(root, "public", "videos"),
    adminUploadsDir: path.join(root, "public", "uploads"),
    databaseJsonFile: DB_FILE
  };
}

const DEFAULT_SETTINGS: StoreSettings = {
  capsuleTitle: "ALUVA, KERALA // 360° ROUNDING BEACHWEAR SHOWCASE",
  bundleDiscountPercent: 15,
  enableCod: false,
  enableUpi: true,
  freeShipping: true,
  supportEmail: "concierge@apoorva.luxury",
  supportPhone: "+91 98470 89421",
  orbitSpeedMultiplier: 1,
  orbitRadiusMultiplier: 1,
  adminPassword: process.env.ADMIN_PASSWORD || "apoorva2026"
};

const DEFAULT_SOCIAL_CONFIG: SocialAutomationConfig = {
  whatsappEnabled: true,
  whatsappBusinessNumber: "+91 98470 89421",
  whatsappPhoneId: "wa_cloud_109482910",
  whatsappAutoConfirmCod: false,
  whatsappWelcomeTemplate:
    "Namaskaram from APOORVA Coastal Beachwear (Aluva, Kerala) 🌴! Reply with:\n1️⃣ 'SET 1' for Coconut & Coir Fringe Beach Set (₹{{price_set1}})\n2️⃣ 'SET 2' for Coconut & Jute Wrap Beach Set (₹{{price_set2}})\n3️⃣ 'BOTH' for the 2-Set Bundle (Save {{discount}}% • ₹{{price_bundle}})\nInclude your Name, Address & 6-digit PIN code to receive your instant Razorpay payment link!",
  instagramEnabled: true,
  instagramHandle: "@apoorva.coastal",
  instagramTriggerKeywords: ["BEACH", "PRICE", "BUY", "SET1", "SET2", "BOTH", "LINK"],
  instagramDmReplyTemplate:
    "Hey beach lover! 🌊 Here is your instant 1-Click Razorpay Express Checkout for our Aluva, Kerala Coconut & Coir/Jute Beach Sets: {{checkout_link}} — or reply right here in DM with your Name, Phone, Address & PIN code for an instant Razorpay payment link!",
  webhookVerifyToken: "apoorva_meta_verify_2026"
};

function createInitialSocialEvents(): SocialAutomationEvent[] {
  const now = Date.now();
  return [
    {
      id: "soc-evt-1",
      channel: "whatsapp",
      senderHandleOrPhone: "+91 98201 44501",
      senderName: "Ananya Deshmukh",
      incomingMessage:
        "BUY BOTH SETS | Ananya Deshmukh | Villa 14, Candolim Beach Road, North Goa | PIN 403515",
      automatedReply:
        "✅ Order #APV-89421 paid via Razorpay & confirmed on WhatsApp! Both Beachwear Sets (15% Bundle Savings • ₹7,395) booked from our Aluva, Kerala Atelier. Blue Dart AWB #BD-88492019IN assigned.",
      detectedIntent: "order_created",
      orderId: "APV-89421",
      amount: 7395,
      timestamp: new Date(now - 2 * 3600 * 1000).toISOString()
    },
    {
      id: "soc-evt-2",
      channel: "instagram",
      senderHandleOrPhone: "@rhea.kapoor.style",
      senderName: "Rhea Kapoor",
      incomingMessage:
        "Commented 'BEACH' on Reel & DMed: SET 2 | Rhea Kapoor | 9811234901 | 42 Pali Hill, Bandra West, Mumbai 400050",
      automatedReply:
        "✅ Instagram DM Razorpay Checkout completed! Order #APV-89314 (Coconut & Jute Wrap Beach Set • ₹4,500 Prepaid) registered & dispatched from Aluva, Kerala via Delhivery Air Express.",
      detectedIntent: "order_created",
      orderId: "APV-89314",
      amount: 4500,
      timestamp: new Date(now - 46 * 3600 * 1000).toISOString()
    }
  ];
}

function createInitialOrders(): OrderRecord[] {
  const now = Date.now();
  const o1Date = new Date(now - 2 * 3600 * 1000).toISOString();
  const o2Date = new Date(now - 18 * 3600 * 1000).toISOString();
  const o3Date = new Date(now - 46 * 3600 * 1000).toISOString();

  return [
    {
      orderId: "APV-89421",
      receiptNumber: "RCP-894210",
      createdAt: o1Date,
      status: "dispatched",
      source: "whatsapp",
      socialHandle: "+91 98201 44501",
      customer: {
        fullName: "Ananya Deshmukh",
        email: "ananya.deshmukh@example.com",
        phone: "9820144501",
        addressLine1: "Villa 14, Candolim Beach Road",
        addressLine2: "Near Taj Resort & Convention",
        city: "North Goa",
        state: "Goa",
        pincode: "403515",
        country: "India",
        orderNotes: "WhatsApp Bot Order — Honeymoon beach trip gift box."
      },
      items: [
        {
          id: "apoorva-01-coir-beach-set-FREE SIZE (Adjustable Tie)",
          productId: "apoorva-01-coir-beach-set",
          name: "COCONUT & COIR FRINGE BEACH SET",
          subName: "PRODUCT 01 // TROPICAL HULA FRINGE BEACHWEAR",
          size: "FREE SIZE (Adjustable Tie)",
          quantity: 1,
          unitPrice: 4200,
          totalPrice: 4200,
          image: "/images/apoorva_model_editorial.png",
          color: "Sun-Kissed Golden Coir & Polished Coconut Shell"
        },
        {
          id: "apoorva-02-jute-wrap-set-FREE SIZE (Adjustable Tie)",
          productId: "apoorva-02-jute-wrap-set",
          name: "COCONUT & JUTE WRAP BEACH SET",
          subName: "PRODUCT 02 // TAILORED A-LINE RESORT BEACHWEAR",
          size: "FREE SIZE (Adjustable Tie)",
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          image: "/images/apoorva_coconut_set.png",
          color: "Natural Sand Jute & Satin-Polished Coconut Shell"
        }
      ],
      pricing: {
        rawSubtotal: 8700,
        discountPercentage: 15,
        discountAmount: 1305,
        subtotal: 7395,
        shippingFee: 0,
        total: 7395,
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: "order_apv_89421",
        razorpayPaymentId: "pay_upi_89421",
        method: "upi",
        isSandbox: true,
        paidAt: o1Date
      },
      shipping: {
        courierName: "Blue Dart Express (Air Cargo)",
        trackingNumber: "BD-88492019IN",
        trackingUrl: "http://localhost:3000/track?orderId=APV-89421",
        estimatedDelivery: "2-3 Business Days",
        dispatchedAt: o1Date
      }
    },
    {
      orderId: "APV-89390",
      receiptNumber: "RCP-893904",
      createdAt: o2Date,
      status: "paid",
      source: "website",
      customer: {
        fullName: "Meera Krishnan",
        email: "meera.k@example.com",
        phone: "9847011223",
        addressLine1: "Flat 12B, Marine Drive Residency",
        city: "Kochi",
        state: "Kerala",
        pincode: "682031",
        country: "India",
        orderNotes: "1-Click Website Express Buy"
      },
      items: [
        {
          id: "apoorva-01-coir-beach-set-S/M (Style A Cup)",
          productId: "apoorva-01-coir-beach-set",
          name: "COCONUT & COIR FRINGE BEACH SET",
          subName: "PRODUCT 01 // TROPICAL HULA FRINGE BEACHWEAR",
          size: "S/M (Style A Cup)",
          quantity: 1,
          unitPrice: 4200,
          totalPrice: 4200,
          image: "/images/apoorva_model_editorial.png",
          color: "Sun-Kissed Golden Coir & Polished Coconut Shell"
        }
      ],
      pricing: {
        rawSubtotal: 4200,
        discountPercentage: 0,
        discountAmount: 0,
        subtotal: 4200,
        shippingFee: 0,
        total: 4200,
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: "order_apv_89390",
        razorpayPaymentId: "pay_upi_89390",
        method: "upi",
        isSandbox: true,
        paidAt: o2Date
      },
      shipping: {
        courierName: "Blue Dart Express",
        trackingNumber: "BD-77319042IN",
        trackingUrl: "http://localhost:3000/track?orderId=APV-89390",
        estimatedDelivery: "1-2 Business Days"
      }
    },
    {
      orderId: "APV-89314",
      receiptNumber: "RCP-893148",
      createdAt: o3Date,
      status: "delivered",
      source: "instagram",
      socialHandle: "@rhea.kapoor.style",
      customer: {
        fullName: "Rhea Kapoor",
        email: "rhea.kapoor@example.com",
        phone: "9811234901",
        addressLine1: "42 Pali Hill, Bandra West",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
        country: "India",
        orderNotes: "Instagram DM Auto-Order — Prepaid via Razorpay"
      },
      items: [
        {
          id: "apoorva-02-jute-wrap-set-FREE SIZE (Adjustable Tie)",
          productId: "apoorva-02-jute-wrap-set",
          name: "COCONUT & JUTE WRAP BEACH SET",
          subName: "PRODUCT 02 // TAILORED A-LINE RESORT BEACHWEAR",
          size: "FREE SIZE (Adjustable Tie)",
          quantity: 1,
          unitPrice: 4500,
          totalPrice: 4500,
          image: "/images/apoorva_coconut_set.png",
          color: "Natural Sand Jute & Satin-Polished Coconut Shell"
        }
      ],
      pricing: {
        rawSubtotal: 4500,
        discountPercentage: 0,
        discountAmount: 0,
        subtotal: 4500,
        shippingFee: 0,
        total: 4500,
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: "order_apv_89314",
        razorpayPaymentId: "pay_rzp_89314",
        method: "razorpay",
        isSandbox: true,
        paidAt: o3Date
      },
      shipping: {
        courierName: "Delhivery Air Express",
        trackingNumber: "DLV-99104281IN",
        trackingUrl: "http://localhost:3000/track?orderId=APV-89314",
        estimatedDelivery: "Delivered",
        dispatchedAt: o3Date
      }
    }
  ];
}

const globalStore = globalThis as unknown as {
  __APOORVA_ADMIN_DB__?: StoreDatabase;
  __APOORVA_CLOUD_SYNCED__?: boolean;
};

export function scanPublicMediaLibrary(
  customMedia: MediaAsset[] = [],
  deletedMediaUrls: string[] = []
): MediaAsset[] {
  const deletedSet = new Set(deletedMediaUrls);
  const assets: MediaAsset[] = [];

  // 1. Put Cloudinary / Custom Media assets from MongoDB first
  for (const item of customMedia) {
    if (deletedSet.has(item.url) || deletedSet.has(item.name)) continue;
    if (!assets.some((a) => a.url === item.url)) {
      assets.push({
        ...item,
        folder: item.folder || "Cloudinary (oiu0lhfe)",
        diskPath: item.diskPath || item.url
      });
    }
  }

  const publicDir = path.join(process.cwd(), "public");

  const scanFolder = (
    subDir: string,
    defaultType: "image" | "video",
    category: MediaAsset["category"]
  ) => {
    const dirPath = path.join(publicDir, subDir);
    if (!fs.existsSync(dirPath)) return;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.startsWith(".")) continue;
        const ext = path.extname(file).toLowerCase();
        const isVideo = [".mp4", ".webm", ".mov"].includes(ext);
        const isImage = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"].includes(ext);
        if (!isVideo && !isImage) continue;

        const url = `/${subDir}/${file}`;
        if (deletedSet.has(url) || deletedSet.has(file)) continue;

        // If this file is already in Cloudinary customMedia, prefer the Cloudinary entry
        if (assets.some((a) => a.name === file || a.url === url)) continue;

        const fullFilePath = path.join(dirPath, file);
        let sizeKB = 0;
        try {
          const stat = fs.statSync(fullFilePath);
          sizeKB = Math.round(stat.size / 1024);
        } catch {
          // ignore
        }

        assets.push({
          id: `${subDir}-${file}`,
          url,
          name: file,
          type: isVideo ? "video" : defaultType,
          category:
            file.includes("logo")
              ? "brand"
              : file.includes("beach_")
                ? "lifestyle"
                : isVideo
                  ? "video"
                  : category,
          folder: `public/${subDir}`,
          diskPath: fullFilePath,
          sizeKB,
          createdAt: new Date().toISOString()
        });
      }
    } catch {
      // Ignore scan errors
    }
  };

  scanFolder("uploads", "image", "upload");
  scanFolder("images", "image", "cutout");
  scanFolder("videos", "video", "video");

  return assets;
}

export function getStoreDatabase(): StoreDatabase {
  if (globalStore.__APOORVA_ADMIN_DB__) {
    return globalStore.__APOORVA_ADMIN_DB__;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw) as StoreDatabase;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        if (!parsed.socialAutomation) {
          parsed.socialAutomation = { ...DEFAULT_SOCIAL_CONFIG };
        }
        if (!Array.isArray(parsed.socialEvents)) {
          parsed.socialEvents = createInitialSocialEvents();
        }
        if (!parsed.settings.adminPassword) {
          parsed.settings.adminPassword = DEFAULT_SETTINGS.adminPassword;
        }
        globalStore.__APOORVA_ADMIN_DB__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[AdminStore] Failed to read store-db.json, initializing defaults:", err);
  }

  const initialDb: StoreDatabase = {
    products: JSON.parse(JSON.stringify(PRODUCTS)),
    beachMoments: JSON.parse(JSON.stringify(BEACH_MOMENTS)),
    settings: { ...DEFAULT_SETTINGS },
    socialAutomation: { ...DEFAULT_SOCIAL_CONFIG },
    socialEvents: createInitialSocialEvents(),
    orders: createInitialOrders(),
    customMedia: [],
    updatedAt: new Date().toISOString()
  };

  saveStoreDatabase(initialDb);
  return initialDb;
}

export async function ensureStoreDatabaseLoaded(): Promise<StoreDatabase> {
  // 1. Always try loading latest state from MongoDB (`apoorva` DB in diefuture cluster)
  try {
    const mongoDb = await loadStoreFromMongoDB();
    if (
      mongoDb &&
      Array.isArray(mongoDb.products) &&
      mongoDb.products.length > 0
    ) {
      if (!mongoDb.socialAutomation) {
        mongoDb.socialAutomation = { ...DEFAULT_SOCIAL_CONFIG };
      }
      if (!Array.isArray(mongoDb.socialEvents)) {
        mongoDb.socialEvents = createInitialSocialEvents();
      }
      if (!mongoDb.settings.adminPassword) {
        mongoDb.settings.adminPassword = DEFAULT_SETTINGS.adminPassword;
      }
      if (!Array.isArray(mongoDb.deletedMediaUrls)) {
        mongoDb.deletedMediaUrls = [];
      }
      globalStore.__APOORVA_ADMIN_DB__ = mongoDb;
      globalStore.__APOORVA_CLOUD_SYNCED__ = true;
      return mongoDb;
    }
  } catch (err) {
    console.warn("[AdminStore] MongoDB load fallback:", err);
  }

  // 2. Fallback to Cloudinary raw state or local disk
  if (!globalStore.__APOORVA_CLOUD_SYNCED__) {
    globalStore.__APOORVA_CLOUD_SYNCED__ = true;
    try {
      const cloudDb = await loadDatabaseFromCloudinary<StoreDatabase>();
      if (
        cloudDb &&
        Array.isArray(cloudDb.products) &&
        cloudDb.products.length > 0
      ) {
        if (!cloudDb.socialAutomation) {
          cloudDb.socialAutomation = { ...DEFAULT_SOCIAL_CONFIG };
        }
        if (!Array.isArray(cloudDb.socialEvents)) {
          cloudDb.socialEvents = createInitialSocialEvents();
        }
        if (!cloudDb.settings.adminPassword) {
          cloudDb.settings.adminPassword = DEFAULT_SETTINGS.adminPassword;
        }
        globalStore.__APOORVA_ADMIN_DB__ = cloudDb;
        await saveStoreToMongoDB(cloudDb);
        return cloudDb;
      }
    } catch {
      // Fallback to local disk
    }
  }
  const localDb = getStoreDatabase();
  await saveStoreToMongoDB(localDb);
  return localDb;
}

export async function persistStoreDatabase(
  db: StoreDatabase
): Promise<StoreDatabase> {
  const saved = saveStoreDatabase(db);
  await Promise.allSettled([
    saveStoreToMongoDB(saved),
    saveDatabaseToCloudinary(saved)
  ]);
  return saved;
}

export function saveStoreDatabase(db: StoreDatabase): StoreDatabase {
  db.updatedAt = new Date().toISOString();
  globalStore.__APOORVA_ADMIN_DB__ = db;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.warn("[AdminStore] Could not write store-db.json:", err);
  }

  // Fire-and-forget MongoDB sync for callers that invoke saveStoreDatabase synchronously
  void saveStoreToMongoDB(db);

  return db;
}

export function recordOrderInStore(order: OrderRecord): OrderRecord {
  const db = getStoreDatabase();
  if (!order.source) {
    order.source = "website";
  }
  const existingIdx = db.orders.findIndex((o) => o.orderId === order.orderId);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = order;
  } else {
    db.orders.unshift(order);
  }

  // Decrement stock for ordered items if matching
  for (const item of order.items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (prod) {
      const sizeEntry = prod.sizes.find((s) => s.size === item.size);
      if (sizeEntry && sizeEntry.stock > 0) {
        sizeEntry.stock = Math.max(0, sizeEntry.stock - item.quantity);
      }
    }
  }

  // Sync with tracking service
  const trackingRecord = generateTrackingData(
    order.orderId,
    order.customer.city || "Mumbai",
    order.customer.state || "Maharashtra",
    order.customer.pincode || "400001",
    order.customer.fullName || "Valued Client"
  );
  if (order.shipping?.trackingNumber) {
    trackingRecord.trackingNumber = order.shipping.trackingNumber;
  }
  if (order.shipping?.courierName) {
    trackingRecord.courierName = order.shipping.courierName;
  }
  saveTrackingRecord(trackingRecord);

  saveStoreDatabase(db);
  return order;
}

export function resetStoreToDefaults(): StoreDatabase {
  const freshDb: StoreDatabase = {
    products: JSON.parse(JSON.stringify(PRODUCTS)),
    beachMoments: JSON.parse(JSON.stringify(BEACH_MOMENTS)),
    settings: { ...DEFAULT_SETTINGS },
    socialAutomation: { ...DEFAULT_SOCIAL_CONFIG },
    socialEvents: createInitialSocialEvents(),
    orders: createInitialOrders(),
    customMedia: [],
    updatedAt: new Date().toISOString()
  };
  return saveStoreDatabase(freshDb);
}
