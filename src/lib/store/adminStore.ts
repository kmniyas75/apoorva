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
import bundledStoreDb from "../../../data/store-db.json";

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
  channel: "whatsapp" | "instagram" | "facebook" | "website";
  senderHandleOrPhone: string;
  senderName: string;
  incomingMessage: string;
  automatedReply: string;
  detectedIntent: "order_created" | "catalog_sent" | "payment_link_sent";
  orderId?: string;
  amount?: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "admin";
  text: string;
  timestamp: string;
  paymentLink?: string;
  orderId?: string;
  images?: Array<{ url: string; caption?: string }>;
  quickReplies?: Array<{ id: string; title: string }>;
}

export interface ChatSession {
  id: string;
  channel: "whatsapp" | "instagram" | "facebook" | "website";
  customerHandleOrPhone: string;
  customerName: string;
  stage:
    | "pitching"
    | "collecting_size"
    | "collecting_name"
    | "collecting_address"
    | "collecting_pincode"
    | "awaiting_payment"
    | "paid";
  aiAutoPilot: boolean;
  selectedProduct?: "set1" | "set2" | "both";
  selectedSize?: string;
  collectedName?: string;
  collectedAddressLine?: string;
  collectedPincode?: string;
  imagesSent?: boolean;
  collectedAddress?: {
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  };
  orderId?: string;
  paymentLink?: string;
  messages: ChatMessage[];
  updatedAt: string;
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
  chatSessions?: ChatSession[];
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
  supportPhone: "+91 73064 09010",
  orbitSpeedMultiplier: 1,
  orbitRadiusMultiplier: 1,
  adminPassword: process.env.ADMIN_PASSWORD || "apoorva2026"
};

const DEFAULT_SOCIAL_CONFIG: SocialAutomationConfig = {
  whatsappEnabled: true,
  whatsappBusinessNumber: "+91 73064 09010",
  whatsappPhoneId: "1332497489956818",
  whatsappAutoConfirmCod: false,
  whatsappWelcomeTemplate:
    "Namaskaram from APOORVA SHELLS (Aluva, Kerala) 🌴! Reply with:\n1️⃣ 'SET 1' for Coconut & Coir Fringe Beach Set (₹{{price_set1}})\n2️⃣ 'SET 2' for Coconut & Jute Wrap Beach Set (₹{{price_set2}})\n3️⃣ 'BOTH' for the 2-Set Bundle (Save {{discount}}% • ₹{{price_bundle}})\nInclude your Name, Address & 6-digit PIN code to receive your instant Razorpay payment link!",
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

export function createInitialChatSessions(): ChatSession[] {
  const now = Date.now();
  return [
    {
      id: "chat-wa-9820144501",
      channel: "whatsapp",
      customerHandleOrPhone: "+91 98201 44501",
      customerName: "Ananya Deshmukh",
      stage: "paid",
      aiAutoPilot: true,
      selectedProduct: "both",
      selectedSize: "FREE SIZE (Adjustable Tie)",
      collectedAddress: {
        addressLine1: "Villa 14, Candolim Beach Road",
        city: "North Goa",
        state: "Goa",
        pincode: "403515"
      },
      orderId: "APV-89421",
      paymentLink: "https://www.apoorvashells.com/?payOrder=APV-89421",
      updatedAt: new Date(now - 2 * 3600 * 1000).toISOString(),
      messages: [
        {
          id: "msg-1",
          sender: "customer",
          text: "Hi! I saw your Coconut beachwear sets on Instagram. Can I wear them in the ocean water in Goa?",
          timestamp: new Date(now - 2.3 * 3600 * 1000).toISOString()
        },
        {
          id: "msg-2",
          sender: "ai",
          text: "Namaskaram Ananya! 🌴 Yes, both our handcrafted sets from Aluva, Kerala are treated with natural virgin coconut oil and lined with organic malmal cotton — 100% saltwater & resort pool safe!\n\n✨ Set 01: Coconut & Coir Fringe Set (₹4,200)\n✨ Set 02: Coconut & Jute Wrap Set (₹4,500)\n🔥 Complete 2-Set Resort Bundle: ₹7,395 (Save 15% — ₹1,305 OFF!)\n\nWhich set would you love for your Goa trip?",
          timestamp: new Date(now - 2.25 * 3600 * 1000).toISOString()
        },
        {
          id: "msg-3",
          sender: "customer",
          text: "I'd love BOTH sets in Free Size! Deliver to Ananya Deshmukh, Villa 14, Candolim Beach Road, North Goa, PIN 403515",
          timestamp: new Date(now - 2.1 * 3600 * 1000).toISOString()
        },
        {
          id: "msg-4",
          sender: "ai",
          text: "🎉 Wonderful choice, Ananya! I've reserved the 2-Set Resort Bundle (15% OFF • ₹7,395) for delivery to Villa 14, Candolim Beach Road (PIN 403515).\n\n💳 Tap your 1-Click Razorpay Payment Link below to complete your order (#APV-89421):\nhttps://www.apoorvashells.com/?payOrder=APV-89421",
          timestamp: new Date(now - 2.05 * 3600 * 1000).toISOString(),
          paymentLink: "https://www.apoorvashells.com/?payOrder=APV-89421",
          orderId: "APV-89421"
        }
      ]
    },
    {
      id: "chat-ig-rhea",
      channel: "instagram",
      customerHandleOrPhone: "@rhea.kapoor.style",
      customerName: "Rhea Kapoor",
      stage: "collecting_address",
      aiAutoPilot: true,
      selectedProduct: "set2",
      selectedSize: "S/M (Style A Cup)",
      updatedAt: new Date(now - 25 * 60 * 1000).toISOString(),
      messages: [
        {
          id: "msg-ig-1",
          sender: "customer",
          text: "Hey! How much is the Coconut & Jute Wrap Skirt set? Does it fit S/M?",
          timestamp: new Date(now - 30 * 60 * 1000).toISOString()
        },
        {
          id: "msg-ig-2",
          sender: "ai",
          text: "Hey Rhea! 🌊 The Coconut & Jute Wrap Beach Set (Product 02) is ₹4,500 with complimentary express shipping from our Aluva, Kerala atelier. And yes — S/M (Style A Cup) is in stock and features adjustable braided jute ties for a custom resort fit!\n\nWould you like me to book S/M for you? Just reply with your full delivery address & 6-digit PIN code and I'll send your instant Razorpay payment link right here in DM! ✨",
          timestamp: new Date(now - 29 * 60 * 1000).toISOString()
        },
        {
          id: "msg-ig-3",
          sender: "customer",
          text: "Yes please! Book Set 2 in S/M for me.",
          timestamp: new Date(now - 26 * 60 * 1000).toISOString()
        },
        {
          id: "msg-ig-4",
          sender: "ai",
          text: "Locked in Set 02 (Coconut & Jute Wrap Set • S/M • ₹4,500) for you, Rhea! 🌴 Please share your Full Delivery Address, Phone Number, and 6-digit PIN code so I can generate your instant Razorpay checkout link.",
          timestamp: new Date(now - 25 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      id: "chat-fb-kavya",
      channel: "facebook",
      customerHandleOrPhone: "fb.me/kavya.menon.kochi",
      customerName: "Kavya Menon",
      stage: "pitching",
      aiAutoPilot: true,
      updatedAt: new Date(now - 10 * 60 * 1000).toISOString(),
      messages: [
        {
          id: "msg-fb-1",
          sender: "customer",
          text: "Hello! Do you ship to Kochi within 2 days? Need beachwear for a Varkala shoot.",
          timestamp: new Date(now - 11 * 60 * 1000).toISOString()
        },
        {
          id: "msg-fb-2",
          sender: "ai",
          text: "Namaskaram Kavya! 🌴 Since our atelier is right here in Aluva, Kochi deliveries arrive within 24 hours via Blue Dart Express!\n\nFor a Varkala cliff & beach shoot, our most photographed pieces are:\n1️⃣ Set 01: Coconut & Coir Fringe Set (₹4,200) — dramatic kinetic movement\n2️⃣ Set 02: Coconut & Jute Wrap Set (₹4,500) — sculpted resort silhouette\n✨ Or grab BOTH sets for ₹7,395 (15% Bundle Discount)!\n\nWhich look would you like for your shoot? Share your preferred set & delivery address with PIN code to get your instant payment link!",
          timestamp: new Date(now - 10 * 60 * 1000).toISOString()
        }
      ]
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
        trackingUrl: "https://www.apoorvashells.com/track?orderId=APV-89421",
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
        trackingUrl: "https://www.apoorvashells.com/track?orderId=APV-89390",
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
        trackingUrl: "https://www.apoorvashells.com/track?orderId=APV-89314",
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
        if (!Array.isArray(parsed.chatSessions)) {
          parsed.chatSessions = createInitialChatSessions();
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

  const bundled = JSON.parse(JSON.stringify(bundledStoreDb)) as StoreDatabase;
  if (bundled && Array.isArray(bundled.products) && bundled.products.length > 0) {
    if (!Array.isArray(bundled.chatSessions)) {
      bundled.chatSessions = createInitialChatSessions();
    }
    globalStore.__APOORVA_ADMIN_DB__ = bundled;
    return bundled;
  }

  const initialDb: StoreDatabase = {
    products: JSON.parse(JSON.stringify(PRODUCTS)),
    beachMoments: JSON.parse(JSON.stringify(BEACH_MOMENTS)),
    settings: { ...DEFAULT_SETTINGS },
    socialAutomation: { ...DEFAULT_SOCIAL_CONFIG },
    socialEvents: createInitialSocialEvents(),
    chatSessions: createInitialChatSessions(),
    orders: createInitialOrders(),
    customMedia: [],
    updatedAt: new Date().toISOString()
  };

  saveStoreDatabase(initialDb);
  return initialDb;
}

export async function ensureStoreDatabaseLoaded(): Promise<StoreDatabase> {
  // 1. Always try loading latest state from Apoorva MongoDB (`cluster0.s3sa1pu.mongodb.net`)
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
      if (!Array.isArray(mongoDb.chatSessions) || mongoDb.chatSessions.length === 0) {
        mongoDb.chatSessions = createInitialChatSessions();
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

  // 2. Fallback to Cloudinary raw state or bundled store-db.json
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
      if (!Array.isArray(cloudDb.chatSessions) || cloudDb.chatSessions.length === 0) {
        cloudDb.chatSessions = createInitialChatSessions();
      }
      if (!cloudDb.settings.adminPassword) {
        cloudDb.settings.adminPassword = DEFAULT_SETTINGS.adminPassword;
      }
      if (!Array.isArray(cloudDb.deletedMediaUrls)) {
        cloudDb.deletedMediaUrls = [];
      }
      globalStore.__APOORVA_ADMIN_DB__ = cloudDb;
      globalStore.__APOORVA_CLOUD_SYNCED__ = true;
      return cloudDb;
    }
  } catch {
    // Fallback to local / bundled store-db.json
  }

  return getStoreDatabase();
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

export function recordOrderInStore(
  order: OrderRecord,
  targetDb?: StoreDatabase
): OrderRecord {
  const db = targetDb || getStoreDatabase();
  if (!order.source) {
    order.source = "website";
  }
  const existingIdx = db.orders.findIndex((o) => o.orderId === order.orderId);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = order;
  } else {
    db.orders.unshift(order);
  }

  // If this order is linked to a chat session and is now paid, update the chat session stage
  if (Array.isArray(db.chatSessions) && order.status === "paid") {
    const linkedChat = db.chatSessions.find((c) => c.orderId === order.orderId);
    if (linkedChat && linkedChat.stage !== "paid") {
      linkedChat.stage = "paid";
      linkedChat.messages.push({
        id: `msg-paid-${Date.now()}`,
        sender: "ai",
        text: `✅ Payment received via Razorpay for Order #${order.orderId} (₹${order.pricing.total.toLocaleString("en-IN")})! Your handcrafted APOORVA SHELLS piece is now queued for express dispatch from Aluva, Kerala. Tracking details will follow shortly.`,
        timestamp: new Date().toISOString(),
        orderId: order.orderId
      });
      linkedChat.updatedAt = new Date().toISOString();
    }
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
    chatSessions: createInitialChatSessions(),
    orders: createInitialOrders(),
    customMedia: [],
    updatedAt: new Date().toISOString()
  };
  return saveStoreDatabase(freshDb);
}
