"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Product, BeachMoment, CUP_STYLES, SKIRT_OPTIONS } from "@/data/products";
import { OrderRecord } from "@/lib/types/checkout";
import {
  StoreSettings,
  MediaAsset,
  SocialAutomationConfig,
  SocialAutomationEvent,
  StoragePathsInfo
} from "@/lib/store/adminStore";
import ApoorvaLogo from "./ApoorvaLogo";
import {
  X,
  Save,
  Upload,
  Package,
  ShoppingBag,
  Image as ImageIcon,
  Settings,
  Film,
  Truck,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  Printer,
  Send,
  IndianRupee,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Layers,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  MessageCircle,
  Camera,
  Bot,
  FolderOpen,
  HardDrive,
  RotateCw,
  Copy,
  Zap
} from "lucide-react";

interface AdminPanelProps {
  isOpen?: boolean;
  isFullPage?: boolean;
  onClose?: () => void;
  onPrintInvoice?: (order: OrderRecord) => void;
}

type AdminTab = "products" | "orders" | "social" | "media" | "settings";

export default function AdminPanel({
  isOpen = true,
  isFullPage = true,
  onClose,
  onPrintInvoice
}: AdminPanelProps) {
  // Authentication state
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // New password state inside Settings tab
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Workspace tabs & sub-category tabs
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [productSubTab, setProductSubTab] = useState<
    "pricing" | "media" | "stock"
  >("pricing");
  const [socialSubTab, setSocialSubTab] = useState<"bots" | "simulator">(
    "bots"
  );
  const [mediaSubTab, setMediaSubTab] = useState<
    "library" | "lookbook" | "paths"
  >("library");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Store Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [beachMoments, setBeachMoments] = useState<BeachMoment[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    capsuleTitle: "ALUVA, KERALA // 360° ROUNDING BEACHWEAR SHOWCASE",
    bundleDiscountPercent: 15,
    enableCod: false,
    enableUpi: true,
    freeShipping: true,
    supportEmail: "concierge@apoorva.luxury",
    supportPhone: "+91 98470 89421",
    orbitSpeedMultiplier: 1,
    orbitRadiusMultiplier: 1
  });
  const [socialAutomation, setSocialAutomation] =
    useState<SocialAutomationConfig>({
      whatsappEnabled: true,
      whatsappBusinessNumber: "+91 98470 89421",
      whatsappPhoneId: "wa_cloud_109482910",
      whatsappAutoConfirmCod: false,
      whatsappWelcomeTemplate: "",
      instagramEnabled: true,
      instagramHandle: "@apoorva.coastal",
      instagramTriggerKeywords: ["BEACH", "PRICE", "BUY", "SET1", "SET2", "BOTH"],
      instagramDmReplyTemplate: "",
      webhookVerifyToken: "apoorva_meta_verify_2026"
    });
  const [socialEvents, setSocialEvents] = useState<SocialAutomationEvent[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [storagePaths, setStoragePaths] = useState<StoragePathsInfo>({
    workspaceRoot: "/Volumes/Niyas SFA/apoorva",
    builtInImagesDir: "/Volumes/Niyas SFA/apoorva/public/images",
    builtInVideosDir: "/Volumes/Niyas SFA/apoorva/public/videos",
    adminUploadsDir: "/Volumes/Niyas SFA/apoorva/public/uploads",
    databaseJsonFile: "/Volumes/Niyas SFA/apoorva/data/store-db.json"
  });

  // Active product index in Products Editor (0 = Set 01, 1 = Set 02, ...)
  const [selectedProdIdx, setSelectedProdIdx] = useState<number>(0);

  // Add New Product Section state
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProductDraft, setNewProductDraft] = useState({
    name: "",
    shortName: "",
    sku: "",
    price: 4600,
    originalPrice: 5600,
    badge: "NEW COASTAL EDITION",
    image: "/images/product-01-coir-cutout.png",
    video: "/videos/beachwear-coir-motion.mp4",
    videoCaption: "Artisanal Handcrafted Beachwear • Aluva, Kerala",
    material: "100% Polished Coconut Shell & Handloom Kerala Coastal Fiber",
    description:
      "Handcrafted in our Aluva, Ernakulam, Kerala coastal atelier. Features organic cotton-lined coconut shell cups with adjustable braided tie cords and a breathable beach wrap.",
    stockFreeSize: 15,
    stockSM: 12,
    stockML: 10
  });

  // Media Picker Modal Target
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{
    label: string;
    filterType?: "image" | "video";
    onSelect: (url: string) => void;
  } | null>(null);

  // Orders filter & search
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderChannelFilter, setOrderChannelFilter] = useState<string>("all");
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(
    null
  );

  // Manual New Order Modal state
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState({
    fullName: "",
    phone: "",
    email: "",
    addressLine1: "",
    city: "Aluva",
    state: "Kerala",
    pincode: "683101",
    productId: "apoorva-01-coir-beach-set",
    size: "FREE SIZE (Adjustable Tie)",
    paymentMethod: "razorpay",
    source: "whatsapp" as "website" | "whatsapp" | "instagram" | "concierge"
  });

  // Social Automation Simulator state
  const [simChannel, setSimChannel] = useState<"whatsapp" | "instagram">(
    "whatsapp"
  );
  const [simName, setSimName] = useState("Diya Nair");
  const [simHandle, setSimHandle] = useState("+91 98472 33190");
  const [simProduct, setSimProduct] = useState<"set1" | "set2" | "both">(
    "set1"
  );
  const [simPayment, setSimPayment] = useState<"razorpay" | "upi" | "card">(
    "razorpay"
  );
  const [simCity, setSimCity] = useState("Aluva");
  const [simPincode, setSimPincode] = useState("683101");
  const [simRunning, setSimRunning] = useState(false);

  // Custom Media URL input
  const [customMediaUrl, setCustomMediaUrl] = useState("");
  const [customMediaName, setCustomMediaName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadCallback, setPendingUploadCallback] = useState<
    ((url: string) => void) | null
  >(null);

  const showToastMessage = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Check authentication session on mount
  useEffect(() => {
    if (!isOpen) return;
    setAuthChecking(true);
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthChecking(false));
  }, [isOpen]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load admin store");
      const data = await res.json();
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.beachMoments)) setBeachMoments(data.beachMoments);
      if (data.settings) setSettings(data.settings);
      if (data.socialAutomation) setSocialAutomation(data.socialAutomation);
      if (Array.isArray(data.socialEvents)) setSocialEvents(data.socialEvents);
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.mediaLibrary)) setMediaLibrary(data.mediaLibrary);
      if (data.storagePaths) setStoragePaths(data.storagePaths);
    } catch (err) {
      console.error("[AdminPanel] Fetch error:", err);
      showToastMessage("error", "Could not load store database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchStoreData();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          password: passwordInput
        })
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setAuthError(data.error || "Incorrect admin password.");
        return;
      }
      setIsAuthenticated(true);
      setPasswordInput("");
    } catch {
      setAuthError("Could not verify password. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" })
    });
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword || newAdminPassword.trim().length < 4) {
      showToastMessage("error", "New password must be at least 4 characters.");
      return;
    }
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          newPassword: newAdminPassword.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setNewAdminPassword("");
      showToastMessage("success", "Admin password updated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password update failed";
      showToastMessage("error", msg);
    }
  };

  // =========================================================================
  // PASSWORD PROTECTION LOGIN GATE FOR /admin
  // =========================================================================
  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-[#141414] text-[#faf8f5] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 font-mono text-xs text-white/70">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
          <span>VERIFYING ADMIN CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#141414] text-[#faf8f5] flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
        <div className="w-full max-w-md bg-[#1f1c18] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <ApoorvaLogo size="md" variant="light" showTagline={true} />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-widest mt-2">
              <Lock className="w-3 h-3" />
              <span>PASSWORD PROTECTED ADMIN PORTAL (/admin)</span>
            </div>
            <p className="text-xs font-mono text-white/60 pt-1">
              Enter your administrator password to manage 360° beachwear media, pricing, orders, and WhatsApp/Instagram automation.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-[10px] font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5"
              >
                Administrator Password
              </label>
              <div className="relative">
                <input
                  id="admin-login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-black/50 border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-950/90 border border-red-500/40 text-red-200 font-mono text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              style={{ backgroundColor: "#f59e0b", color: "#000000" }}
              className="w-full py-3.5 rounded-full font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {loggingIn ? "UNLOCKING STUDIO..." : "UNLOCK ADMIN STUDIO"}
              </span>
            </button>
          </form>

          {/* Quick Demo Fill & Storefront Return */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-white/50">
            <button
              type="button"
              onClick={() => setPasswordInput("apoorva2026")}
              className="underline hover:text-amber-300 transition-colors"
            >
              Use Default Password (apoorva2026)
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Back to Storefront</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED ADMIN WORKSPACE HANDLERS
  // =========================================================================
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          beachMoments,
          settings,
          socialAutomation,
          orders
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save changes");

      if (result.data) {
        setProducts(result.data.products);
        setBeachMoments(result.data.beachMoments);
        setSettings(result.data.settings);
        if (result.data.socialAutomation) {
          setSocialAutomation(result.data.socialAutomation);
        }
        setOrders(result.data.orders);
        if (result.data.mediaLibrary) setMediaLibrary(result.data.mediaLibrary);
        if (result.data.storagePaths) setStoragePaths(result.data.storagePaths);
      }
      showToastMessage(
        "success",
        "Saved! 360° media, pricing, orders & automation settings are live."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      showToastMessage("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" })
      });
      const result = await res.json();
      if (result.data) {
        setProducts(result.data.products);
        setBeachMoments(result.data.beachMoments);
        setSettings(result.data.settings);
        if (result.data.socialAutomation) {
          setSocialAutomation(result.data.socialAutomation);
        }
        if (Array.isArray(result.data.socialEvents)) {
          setSocialEvents(result.data.socialEvents);
        }
        setOrders(result.data.orders);
        if (result.data.mediaLibrary) setMediaLibrary(result.data.mediaLibrary);
      }
      showToastMessage("success", "Reset store to factory defaults.");
    } catch {
      showToastMessage("error", "Could not reset store.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (Array.isArray(data.mediaLibrary)) {
        setMediaLibrary(data.mediaLibrary);
      } else if (data.asset) {
        setMediaLibrary((prev) => [data.asset, ...prev]);
      }

      if (pendingUploadCallback && data.asset?.url) {
        pendingUploadCallback(data.asset.url);
        setPendingUploadCallback(null);
        showToastMessage(
          "success",
          `Uploaded to public/uploads/${data.asset.name} & assigned! Click Save & Publish Live.`
        );
      } else {
        showToastMessage(
          "success",
          `Uploaded ${data.asset?.name} to /public/uploads/!`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "File upload failed";
      showToastMessage("error", msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUploadForField = (callback?: (url: string) => void) => {
    setPendingUploadCallback(() => callback || null);
    fileInputRef.current?.click();
  };

  const handleUpdateProductField = <K extends keyof Product>(
    idx: number,
    field: K,
    value: Product[K]
  ) => {
    setProducts((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleUpdateProductStock = (
    prodIdx: number,
    sizeIdx: number,
    newStock: number
  ) => {
    setProducts((prev) => {
      const next = [...prev];
      const prod = next[prodIdx];
      if (!prod) return prev;
      const updatedSizes = prod.sizes.map((s, i) =>
        i === sizeIdx ? { ...s, stock: Math.max(0, newStock) } : s
      );
      next[prodIdx] = { ...prod, sizes: updatedSizes };
      return next;
    });
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductDraft.name.trim()) {
      showToastMessage("error", "Please enter a product name.");
      return;
    }

    const nextNum = String(products.length + 1).padStart(2, "0");
    const slug = newProductDraft.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const createdProduct: Product = {
      id: `apoorva-${nextNum}-${slug || Date.now()}`,
      sku:
        newProductDraft.sku.trim().toUpperCase() || `APV-BCH-${nextNum}`,
      number: nextNum,
      name: newProductDraft.name.trim().toUpperCase(),
      shortName:
        newProductDraft.shortName.trim().toUpperCase() ||
        newProductDraft.name.trim().slice(0, 18).toUpperCase(),
      subName: `SET ${nextNum} // ALUVA, KERALA COASTAL EDITION`,
      price: Math.max(100, Number(newProductDraft.price) || 4600),
      originalPrice: Math.max(
        0,
        Number(newProductDraft.originalPrice) || 5600
      ),
      badge: newProductDraft.badge.trim() || `SET ${nextNum} EDITION`,
      description:
        newProductDraft.description.trim() ||
        "Handcrafted in our Aluva, Ernakulam, Kerala coastal atelier.",
      material:
        newProductDraft.material.trim() ||
        "100% Polished Coconut Shell & Handloom Kerala Coastal Fiber",
      color: "Sun-Baked Coconut & Coastal Sand",
      gsm: "390g (Full Set)",
      fit: "Adjustable Neck & Back Tie Cords + Wrap Skirt",
      edition: "Aluva, Kerala Coastal Edition",
      image:
        newProductDraft.image.trim() || "/images/product-01-coir-cutout.png",
      modelImage:
        newProductDraft.image.trim() || "/images/product-01-coir-cutout.png",
      video:
        newProductDraft.video.trim() || "/videos/beachwear-coir-motion.mp4",
      videoCaption:
        newProductDraft.videoCaption.trim() ||
        `Set ${nextNum} Live Motion • Aluva, Kerala`,
      gallery: [
        newProductDraft.image.trim() || "/images/product-01-coir-cutout.png",
        "/images/beach-1.jpg",
        "/images/beach-2.jpg"
      ],
      features: [
        "100% Organic Cotton-Lined Coconut Shell Cups",
        "Adjustable Braided Tie Cords for Custom Fit",
        "Handcrafted in Aluva, Ernakulam, Kerala",
        "Water-Resistant & Quick-Drying Coastal Weave"
      ],
      cupStyles: CUP_STYLES,
      skirtOptions: SKIRT_OPTIONS,
      sizes: [
        {
          size: "FREE SIZE (Adjustable Tie)",
          stock: Math.max(0, Number(newProductDraft.stockFreeSize) || 15)
        },
        {
          size: "S / M (Cup A-B • Waist 24-29)",
          stock: Math.max(0, Number(newProductDraft.stockSM) || 12)
        },
        {
          size: "M / L (Cup C-D • Waist 29-34)",
          stock: Math.max(0, Number(newProductDraft.stockML) || 10)
        }
      ],
      tags: ["beachwear", "coconut", "kerala", "aluva", "coastal", slug]
    };

    const nextProducts = [...products, createdProduct];
    setProducts(nextProducts);
    setSelectedProdIdx(nextProducts.length - 1);
    setShowAddProductForm(false);

    // Persist immediately to store-db.json
    try {
      setSaving(true);
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: nextProducts,
          beachMoments,
          settings,
          socialAutomation,
          orders
        })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setProducts(result.data.products);
      }
      showToastMessage(
        "success",
        `Added Set ${nextNum} (${createdProduct.shortName}) to the 360° Showcase & Storefront!`
      );
      setNewProductDraft((prev) => ({
        ...prev,
        name: "",
        shortName: "",
        sku: ""
      }));
    } catch {
      showToastMessage(
        "error",
        "Added locally — click Save & Publish Live to persist."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (idxToRemove: number) => {
    if (products.length <= 1) {
      showToastMessage(
        "error",
        "At least 1 product must remain in the store catalog."
      );
      return;
    }
    const target = products[idxToRemove];
    const nextProducts = products
      .filter((_, idx) => idx !== idxToRemove)
      .map((p, i) => ({
        ...p,
        number: String(i + 1).padStart(2, "0")
      }));

    setProducts(nextProducts);
    setSelectedProdIdx(Math.max(0, idxToRemove - 1));

    try {
      setSaving(true);
      await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: nextProducts,
          beachMoments,
          settings,
          socialAutomation,
          orders
        })
      });
      showToastMessage(
        "success",
        `Removed ${target?.shortName || "Product"} and updated 360° showcase.`
      );
    } catch {
      showToastMessage("error", "Could not persist product deletion.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (
    order: OrderRecord,
    newStatus: OrderRecord["status"],
    sendEmail = false
  ) => {
    setDispatchingOrderId(order.orderId);
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_order",
          orderId: order.orderId,
          status: newStatus,
          courierName: order.shipping?.courierName || "Blue Dart Express",
          trackingNumber:
            order.shipping?.trackingNumber ||
            `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
          orderNotes: order.customer.orderNotes,
          sendDispatchEmail: sendEmail
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
      showToastMessage(
        "success",
        data.message || `Order ${order.orderId} updated.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Order update failed";
      showToastMessage("error", msg);
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleUpdateOrderShippingLocal = (
    orderId: string,
    field: "courierName" | "trackingNumber",
    value: string
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.orderId !== orderId) return o;
        return {
          ...o,
          shipping: {
            courierName: o.shipping?.courierName || "Blue Dart Express",
            trackingNumber: o.shipping?.trackingNumber || "BD-88492019IN",
            trackingUrl:
              o.shipping?.trackingUrl ||
              `http://localhost:3000/track?orderId=${o.orderId}`,
            estimatedDelivery:
              o.shipping?.estimatedDelivery || "2-3 Business Days",
            [field]: value
          }
        };
      })
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_order", orderId })
      });
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
      showToastMessage("success", `Deleted order ${orderId}`);
    } catch {
      showToastMessage("error", "Failed to delete order");
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer.fullName.trim() || !newOrderCustomer.phone.trim()) {
      showToastMessage("error", "Please enter customer name and phone.");
      return;
    }

    const chosenProd =
      products.find((p) => p.id === newOrderCustomer.productId) || products[0];
    const orderId = `APV-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const newOrder: OrderRecord = {
      orderId,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      createdAt: nowIso,
      status: "paid",
      source: newOrderCustomer.source,
      socialHandle: newOrderCustomer.phone.trim(),
      customer: {
        fullName: newOrderCustomer.fullName.trim(),
        phone: newOrderCustomer.phone.trim(),
        email:
          newOrderCustomer.email.trim() ||
          `${newOrderCustomer.phone.replace(/\D/g, "").slice(-10)}@apoorva.store`,
        addressLine1:
          newOrderCustomer.addressLine1.trim() || "Beach Resort Concierge Desk",
        city: newOrderCustomer.city.trim() || "Mumbai",
        state: newOrderCustomer.state.trim() || "Maharashtra",
        pincode: newOrderCustomer.pincode.trim() || "400050",
        country: "India",
        orderNotes: `Created via Admin (${newOrderCustomer.source.toUpperCase()})`
      },
      items: [
        {
          id: `${chosenProd.id}-${newOrderCustomer.size}`,
          productId: chosenProd.id,
          name: chosenProd.name,
          subName: chosenProd.subName,
          size: newOrderCustomer.size,
          quantity: 1,
          unitPrice: chosenProd.price,
          totalPrice: chosenProd.price,
          image: chosenProd.image,
          color: chosenProd.color
        }
      ],
      pricing: {
        rawSubtotal: chosenProd.price,
        discountPercentage: 0,
        discountAmount: 0,
        subtotal: chosenProd.price,
        shippingFee: 0,
        total: chosenProd.price,
        currency: "INR"
      },
      payment: {
        gateway: "razorpay",
        razorpayOrderId: `ADMIN-${orderId}`,
        razorpayPaymentId: `PAY-${Date.now().toString().slice(-6)}`,
        method: newOrderCustomer.paymentMethod,
        isSandbox: true,
        paidAt: nowIso
      },
      shipping: {
        courierName: "Blue Dart Express",
        trackingNumber: `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
        trackingUrl: `http://localhost:3000/track?orderId=${orderId}`,
        estimatedDelivery: "2-3 Business Days"
      }
    };

    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record_order", order: newOrder })
      });
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
      setShowNewOrderForm(false);
      showToastMessage("success", `Created order ${orderId}!`);
    } catch {
      showToastMessage("error", "Could not create order.");
    }
  };

  // Trigger simulated WhatsApp / Instagram automated order via webhook
  const handleRunSocialOrderSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimRunning(true);
    try {
      const labelProduct =
        simProduct === "both"
          ? "BUY BOTH SETS"
          : simProduct === "set2"
            ? "BUY SET 2 (JUTE WRAP)"
            : "BUY SET 1 (COIR FRINGE)";
      const simulatedMsg = `${labelProduct} | ${simName} | ${simCity}, PIN ${simPincode} | ${simPayment.toUpperCase()}`;

      const res = await fetch("/api/webhooks/social-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: simChannel,
          senderName: simName,
          senderHandleOrPhone: simHandle,
          message: simulatedMsg,
          productSelection: simProduct,
          paymentMethod: simPayment,
          addressLine1: `Beachfront Resort Road, ${simCity}`,
          city: simCity,
          state: "Kerala",
          pincode: simPincode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Webhook simulation failed");

      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.socialEvents)) setSocialEvents(data.socialEvents);
      showToastMessage(
        "success",
        data.message || "Social automated order completed!"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation failed";
      showToastMessage("error", msg);
    } finally {
      setSimRunning(false);
    }
  };

  const handleAddCustomMediaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMediaUrl.trim()) return;
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_media_url",
          url: customMediaUrl.trim(),
          name: customMediaName.trim() || undefined
        })
      });
      const data = await res.json();
      if (Array.isArray(data.mediaLibrary)) {
        setMediaLibrary(data.mediaLibrary);
      }
      setCustomMediaUrl("");
      setCustomMediaName("");
      showToastMessage("success", "Added media URL to library!");
    } catch {
      showToastMessage("error", "Could not add media URL.");
    }
  };

  const handleDeleteMediaAsset = async (asset: MediaAsset) => {
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_media",
          assetId: asset.id,
          url: asset.url,
          diskPath: asset.diskPath
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToastMessage("error", data.error || "Could not delete media file.");
        return;
      }
      if (Array.isArray(data.mediaLibrary)) {
        setMediaLibrary(data.mediaLibrary);
      }
      if (Array.isArray(data.products)) {
        setProducts(data.products);
      }
      showToastMessage(
        "success",
        data.message || `Deleted ${asset.name} from storage.`
      );
    } catch {
      showToastMessage("error", "Failed to delete media file.");
    }
  };

  // KPI calculations
  const totalRevenue = orders
    .filter((o) => o.status !== "failed" && o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
  const pendingOrdersCount = orders.filter(
    (o) =>
      o.status === "paid" ||
      o.status === "processing" ||
      o.status === "handcrafted"
  ).length;
  const whatsappOrdersCount = orders.filter(
    (o) => o.source === "whatsapp"
  ).length;
  const instagramOrdersCount = orders.filter(
    (o) => o.source === "instagram"
  ).length;
  const activeProduct = products[selectedProdIdx] || products[0];
  const bundleCombinedPrice =
    products.length >= 2
      ? Math.round(
        (products[0].price + products[1].price) *
        (1 - (settings.bundleDiscountPercent || 15) / 100)
      )
      : 0;

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      orderStatusFilter === "all" || o.status === orderStatusFilter;
    const matchesChannel =
      orderChannelFilter === "all" ||
      (o.source || "website") === orderChannelFilter;
    const q = orderSearch.trim().toLowerCase();
    if (!q) return matchesStatus && matchesChannel;
    return (
      matchesStatus &&
      matchesChannel &&
      (o.orderId.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q) ||
        o.customer.city.toLowerCase().includes(q) ||
        (o.shipping?.trackingNumber || "").toLowerCase().includes(q))
    );
  });

  return (
    <div
      className={
        isFullPage
          ? "min-h-screen w-full bg-white text-[#141414] flex flex-col"
          : "fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      }
    >
      {/* Hidden File Input for Direct Image/Video Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className={
          isFullPage
            ? "w-full max-w-7xl mx-auto flex-1 flex flex-col my-2 sm:my-4 px-2.5 sm:px-6 pb-[env(safe-area-inset-bottom,0px)]"
            : "relative w-full max-w-6xl max-h-[calc(100dvh-1rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] sm:max-h-[94dvh] bg-white border border-black/20 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        }
      >
        {/* =================================================================
            CLEAN TOP ADMIN HEADER BAR
           ================================================================= */}
        <header className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-[#141414] text-[#faf8f5] flex items-center justify-between gap-2 rounded-t-2xl sm:rounded-t-3xl">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <ApoorvaLogo size="sm" variant="light" showTagline={false} />
            <div className="h-5 w-[1px] bg-white/15 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>ADMIN STUDIO</span>
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-emerald-300 font-bold">
                  REV: ₹{totalRevenue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Actions: Save Changes + Storefront + Lock */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              style={{ backgroundColor: "#f59e0b", color: "#000000" }}
              className="px-3.5 sm:px-4 py-2 rounded-full font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:opacity-95 active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>

            <a
              href="/"
              className="px-2.5 sm:px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              title="Open Live Storefront"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Store</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
              title="Lock & Logout of Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            {!isFullPage && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close Admin Panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Status Toast Banner */}
        {toast && (
          <div
            className={`px-3.5 sm:px-6 py-2.5 font-mono text-xs font-bold flex items-center justify-between gap-2 ${toast.type === "success"
              ? "bg-emerald-800 text-white"
              : "bg-red-800 text-white"
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />
              )}
              <span className="break-words">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white text-[10px] uppercase shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =================================================================
            MAIN 5-CATEGORY NAVIGATION BAR (SINGLE ROW ON MOBILE & DESKTOP)
           ================================================================= */}
        <nav
          aria-label="Admin Categories"
          className="bg-neutral-100 border-b border-black/10 px-2 sm:px-6 py-2"
        >
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`py-2 px-1 sm:px-3.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${activeTab === "products"
                ? "bg-[#141414] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-black/75 border border-black/8"
                }`}
            >
              <RotateCw className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`py-2 px-1 sm:px-3.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all relative ${activeTab === "orders"
                ? "bg-[#141414] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-black/75 border border-black/8"
                }`}
            >
              <Package className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">Orders ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("social")}
              className={`py-2 px-1 sm:px-3.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${activeTab === "social"
                ? "bg-[#141414] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-black/75 border border-black/8"
                }`}
            >
              <Bot className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">WA / IG</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("media")}
              className={`py-2 px-1 sm:px-3.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${activeTab === "media"
                ? "bg-[#141414] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-black/75 border border-black/8"
                }`}
            >
              <HardDrive className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">Media</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`py-2 px-1 sm:px-3.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${activeTab === "settings"
                ? "bg-[#141414] text-white shadow-xs"
                : "bg-white/80 hover:bg-white text-black/75 border border-black/8"
                }`}
            >
              <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          </div>
        </nav>

        {/* =================================================================
            MAIN ADMIN WORKSPACE BODY
           ================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 bg-white rounded-b-2xl sm:rounded-b-3xl">
          {loading ? (
            <div className="py-20 text-center font-mono text-sm text-black/60 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-800" />
              <span>Loading APOORVA Admin Studio...</span>
            </div>
          ) : (
            <>
              {/* =============================================================
                  CATEGORY 1: CATALOG, PRICING & 360° STAGE
                 ============================================================= */}
              {activeTab === "products" && activeProduct && (
                <div className="space-y-4 sm:space-y-5">
                  {/* STEP 1: UNIFIED PRODUCT SET SELECTOR (Replaces duplicate Set & Orbit Slot bars) */}
                  <div className="bg-neutral-50 p-3.5 sm:p-4 rounded-2xl border border-black/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 block">
                          STEP 1 // CHOOSE PRODUCT SET
                        </span>
                        <h2 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                          Active 360° Showcase Catalog ({products.length} Sets)
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddProductForm(!showAddProductForm)}
                        className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-black text-white font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>
                          {showAddProductForm ? "Close Form" : "New Set"}
                        </span>
                      </button>
                    </div>

                    {/* Visual Product Cards Grid */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                      {products.map((prod, idx) => {
                        const isSelected = selectedProdIdx === idx;
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => setSelectedProdIdx(idx)}
                            className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-3 rounded-xl text-left transition-all min-w-0 overflow-hidden border ${isSelected
                              ? "bg-[#141414] text-white border-[#141414] shadow-md"
                              : "bg-white hover:bg-neutral-100/80 text-black border-black/12"
                              }`}
                          >
                            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                              <div className="w-11 h-12 rounded-lg bg-white/95 border border-black/10 flex items-center justify-center shrink-0 p-1">
                                <Image
                                  src={prod.image}
                                  alt={prod.name}
                                  width={40}
                                  height={44}
                                  unoptimized
                                  style={{
                                    width: "40px",
                                    height: "44px",
                                    objectFit: "contain"
                                  }}
                                />
                              </div>
                              <span
                                className={`sm:hidden px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase ${isSelected
                                  ? "bg-amber-400 text-black"
                                  : "bg-neutral-100 text-black/70"
                                  }`}
                              >
                                SET {prod.number}
                              </span>
                            </div>

                            <div className="font-mono min-w-0 w-full flex-1">
                              <div className="hidden sm:flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${isSelected
                                    ? "bg-amber-400 text-black"
                                    : "bg-amber-500/15 text-amber-900"
                                    }`}
                                >
                                  SET {prod.number}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] text-amber-300 font-bold uppercase">
                                    • Editing
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-xs sm:text-sm font-black truncate ${isSelected ? "text-white" : "text-black"
                                  }`}
                              >
                                {prod.shortName}
                              </div>
                              <div
                                className={`text-[11px] font-bold mt-0.5 ${isSelected ? "text-amber-300" : "text-black/65"
                                  }`}
                              >
                                ₹{prod.price.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ===========================================================
                      COLLAPSIBLE ADD NEW PRODUCT DRAWER
                     =========================================================== */}
                  {showAddProductForm && (
                    <form
                      onSubmit={handleCreateNewProduct}
                      className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-amber-500 shadow-lg space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-black/10 pb-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-bold block">
                            NEW CATALOG ITEM
                          </span>
                          <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
                            Create Set{" "}
                            {String(products.length + 1).padStart(2, "0")}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddProductForm(false)}
                          className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="new-prod-name"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            Full Product Name *
                          </label>
                          <input
                            id="new-prod-name"
                            type="text"
                            required
                            value={newProductDraft.name}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                name: e.target.value
                              }))
                            }
                            placeholder="e.g. COCONUT & HANDLOOM LINEN SARONG SET"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-prod-short"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            Short Label
                          </label>
                          <input
                            id="new-prod-short"
                            type="text"
                            value={newProductDraft.shortName}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                shortName: e.target.value
                              }))
                            }
                            placeholder="e.g. LINEN SARONG SET"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-prod-sku"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            SKU Code
                          </label>
                          <input
                            id="new-prod-sku"
                            type="text"
                            value={newProductDraft.sku}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                sku: e.target.value
                              }))
                            }
                            placeholder={`APV-BCH-${String(
                              products.length + 1
                            ).padStart(2, "0")}`}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-prod-price"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            Selling Price (₹ INR) *
                          </label>
                          <input
                            id="new-prod-price"
                            type="number"
                            inputMode="numeric"
                            min={100}
                            required
                            value={newProductDraft.price}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                price: Number(e.target.value) || 0
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-sm font-black"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-prod-mrp"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            Original Price / MRP (₹)
                          </label>
                          <input
                            id="new-prod-mrp"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={newProductDraft.originalPrice}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                originalPrice: Number(e.target.value) || 0
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-sm"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="new-prod-material"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                          >
                            Material &amp; Craftsmanship
                          </label>
                          <input
                            id="new-prod-material"
                            type="text"
                            value={newProductDraft.material}
                            onChange={(e) =>
                              setNewProductDraft((p) => ({
                                ...p,
                                material: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-3 rounded-xl bg-neutral-50 border border-black/15 space-y-2">
                          <label
                            htmlFor="new-prod-img"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70"
                          >
                            360° Cutout Image
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              id="new-prod-img"
                              type="text"
                              value={newProductDraft.image}
                              onChange={(e) =>
                                setNewProductDraft((p) => ({
                                  ...p,
                                  image: e.target.value
                                }))
                              }
                              className="w-full sm:flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-white border border-black/15 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setMediaPickerTarget({
                                  label: "Select 360° Cutout Image",
                                  filterType: "image",
                                  onSelect: (url) =>
                                    setNewProductDraft((p) => ({
                                      ...p,
                                      image: url
                                    }))
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-black text-white font-mono text-[10px] font-bold uppercase"
                            >
                              Library
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                triggerUploadForField((url) =>
                                  setNewProductDraft((p) => ({
                                    ...p,
                                    image: url
                                  }))
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-mono text-[10px] font-black uppercase"
                            >
                              Upload
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-50 border border-black/15 space-y-2">
                          <label
                            htmlFor="new-prod-vid"
                            className="block text-[10px] font-mono uppercase font-bold text-black/70"
                          >
                            Motion Video (.MP4)
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              id="new-prod-vid"
                              type="text"
                              value={newProductDraft.video}
                              onChange={(e) =>
                                setNewProductDraft((p) => ({
                                  ...p,
                                  video: e.target.value
                                }))
                              }
                              className="w-full sm:flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-white border border-black/15 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setMediaPickerTarget({
                                  label: "Select Motion Video",
                                  filterType: "video",
                                  onSelect: (url) =>
                                    setNewProductDraft((p) => ({
                                      ...p,
                                      video: url
                                    }))
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-black text-white font-mono text-[10px] font-bold uppercase"
                            >
                              Library
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                triggerUploadForField((url) =>
                                  setNewProductDraft((p) => ({
                                    ...p,
                                    video: url
                                  }))
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-mono text-[10px] font-black uppercase"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => setShowAddProductForm(false)}
                          className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 font-mono text-xs font-bold uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 rounded-xl bg-[#141414] text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-amber-300" />
                          <span>Create Set</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 2: 3-CATEGORY SUB-NAVIGATION FOR EDITING SELECTED PRODUCT */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50">
                        STEP 2 // EDITING SET {activeProduct.number}:{" "}
                        <strong className="text-black">
                          {activeProduct.shortName}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1.5 rounded-2xl border border-black/10">
                      <button
                        type="button"
                        onClick={() => setProductSubTab("pricing")}
                        className={`py-2.5 px-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${productSubTab === "pricing"
                          ? "bg-white text-black shadow-xs border border-black/10"
                          : "text-black/60 hover:text-black"
                          }`}
                      >
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">Pricing &amp; Info</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductSubTab("media")}
                        className={`py-2.5 px-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${productSubTab === "media"
                          ? "bg-white text-black shadow-xs border border-black/10"
                          : "text-black/60 hover:text-black"
                          }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">360° &amp; Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductSubTab("stock")}
                        className={`py-2.5 px-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${productSubTab === "stock"
                          ? "bg-white text-black shadow-xs border border-black/10"
                          : "text-black/60 hover:text-black"
                          }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-black/70 shrink-0" />
                        <span className="truncate">Sizes &amp; Stock</span>
                      </button>
                    </div>

                    {/* -------------------------------------------------------
                        SUB-TAB A: PRICING & PRODUCT DETAILS
                       ------------------------------------------------------- */}
                    {productSubTab === "pricing" && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                        {/* Pricing Card */}
                        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2.5">
                            <span className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                              <IndianRupee className="w-4 h-4 text-emerald-800 shrink-0" />
                              <span>Set {activeProduct.number} Pricing</span>
                            </span>
                            {activeProduct.originalPrice &&
                              activeProduct.originalPrice >
                                activeProduct.price && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">
                                  Saves ₹
                                  {(
                                    activeProduct.originalPrice -
                                    activeProduct.price
                                  ).toLocaleString("en-IN")}
                                </span>
                              )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor="prod-price"
                                className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                              >
                                Selling Price (₹)
                              </label>
                              <input
                                id="prod-price"
                                type="number"
                                inputMode="numeric"
                                min={100}
                                step={50}
                                value={activeProduct.price}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "price",
                                    Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-black/20 font-mono text-base font-black text-black"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="prod-orig-price"
                                className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                              >
                                MRP / Compare (₹)
                              </label>
                              <input
                                id="prod-orig-price"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={50}
                                value={activeProduct.originalPrice || 0}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "originalPrice",
                                    Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-black/20 font-mono text-base font-bold text-black/70"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-black/8">
                            <label
                              htmlFor="bundle-discount-pct"
                              className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                            >
                              &ldquo;Buy Both Sets&rdquo; Bundle Discount (%)
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                id="bundle-discount-pct"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={75}
                                value={settings.bundleDiscountPercent}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    bundleDiscountPercent: Math.min(
                                      75,
                                      Math.max(0, Number(e.target.value) || 0)
                                    )
                                  }))
                                }
                                className="w-28 px-3 py-2 rounded-xl bg-neutral-50 border border-black/20 font-mono text-sm font-black text-amber-900"
                              />
                              <span className="text-xs font-mono text-black/70">
                                Combined Bundle:{" "}
                                <strong className="text-black">
                                  ₹{bundleCombinedPrice.toLocaleString("en-IN")}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Product Titles & Copy Card */}
                        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3.5">
                          <span className="text-xs font-mono font-black uppercase tracking-wider text-black block border-b border-black/10 pb-2.5">
                            Product Title &amp; Description
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor="prod-name"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Full Product Title
                              </label>
                              <input
                                id="prod-name"
                                type="text"
                                value={activeProduct.name}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="prod-short-name"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                360° Turntable Pill Name
                              </label>
                              <input
                                id="prod-short-name"
                                type="text"
                                value={activeProduct.shortName}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "shortName",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="prod-badge"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Highlight Badge
                              </label>
                              <input
                                id="prod-badge"
                                type="text"
                                value={activeProduct.badge || ""}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "badge",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="prod-material"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Material &amp; Craftsmanship
                              </label>
                              <input
                                id="prod-material"
                                type="text"
                                value={activeProduct.material}
                                onChange={(e) =>
                                  handleUpdateProductField(
                                    selectedProdIdx,
                                    "material",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="prod-desc"
                              className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                            >
                              Product Description
                            </label>
                            <textarea
                              id="prod-desc"
                              rows={3}
                              value={activeProduct.description}
                              onChange={(e) =>
                                handleUpdateProductField(
                                  selectedProdIdx,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        SUB-TAB B: 360° CUTOUT, VIDEO & GALLERY
                       ------------------------------------------------------- */}
                    {productSubTab === "media" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                          {/* 1. 360° Rotating Cutout Image Card */}
                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>360° Cutout Image (Set {activeProduct.number})</span>
                              </span>
                            </div>

                            <div className="h-48 rounded-2xl bg-neutral-100 border border-black/10 flex items-center justify-center p-4 relative overflow-hidden">
                              <Image
                                src={activeProduct.image}
                                alt={activeProduct.name}
                                width={160}
                                height={175}
                                unoptimized
                                style={{
                                  width: "160px",
                                  height: "175px",
                                  objectFit: "contain"
                                }}
                              />
                            </div>

                            <input
                              id="prod-cutout-url"
                              type="text"
                              aria-label="360° Cutout Image Path"
                              value={activeProduct.image}
                              onChange={(e) =>
                                handleUpdateProductField(
                                  selectedProdIdx,
                                  "image",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaPickerTarget({
                                    label: `Select 360° Cutout for ${activeProduct.shortName}`,
                                    filterType: "image",
                                    onSelect: (url) =>
                                      handleUpdateProductField(
                                        selectedProdIdx,
                                        "image",
                                        url
                                      )
                                  })
                                }
                                className="py-2 px-3 rounded-xl bg-[#141414] text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                <span>Choose Saved</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  triggerUploadForField((url) =>
                                    handleUpdateProductField(
                                      selectedProdIdx,
                                      "image",
                                      url
                                    )
                                  )
                                }
                                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                              >
                                <Upload className="w-3.5 h-3.5 shrink-0" />
                                <span>Upload New</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. Product Motion Video Card */}
                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                                <Film className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>Motion Video (Set {activeProduct.number})</span>
                              </span>
                            </div>

                            <div className="h-48 rounded-2xl bg-black overflow-hidden relative">
                              <video
                                key={activeProduct.video}
                                src={activeProduct.video}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                              />
                            </div>

                            <input
                              id="prod-video-url"
                              type="text"
                              aria-label="Motion Video Path"
                              value={activeProduct.video}
                              onChange={(e) =>
                                handleUpdateProductField(
                                  selectedProdIdx,
                                  "video",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaPickerTarget({
                                    label: `Select Video for ${activeProduct.shortName}`,
                                    filterType: "video",
                                    onSelect: (url) =>
                                      handleUpdateProductField(
                                        selectedProdIdx,
                                        "video",
                                        url
                                      )
                                  })
                                }
                                className="py-2 px-3 rounded-xl bg-[#141414] text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                              >
                                <Film className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                <span>Choose Saved</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  triggerUploadForField((url) =>
                                    handleUpdateProductField(
                                      selectedProdIdx,
                                      "video",
                                      url
                                    )
                                  )
                                }
                                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                              >
                                <Upload className="w-3.5 h-3.5 shrink-0" />
                                <span>Upload MP4</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Gallery & 360° Speed Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-8 bg-white p-4 rounded-2xl border border-black/12 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                                Gallery Photos ({activeProduct.gallery.length})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaPickerTarget({
                                    label: `Add Photo to ${activeProduct.shortName} Gallery`,
                                    filterType: "image",
                                    onSelect: (url) =>
                                      handleUpdateProductField(
                                        selectedProdIdx,
                                        "gallery",
                                        [...activeProduct.gallery, url]
                                      )
                                  })
                                }
                                className="px-3 py-1 rounded-full bg-black text-white font-mono text-[10px] font-bold uppercase flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Photo</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                              {activeProduct.gallery.map((imgUrl, gIdx) => (
                                <div
                                  key={`${imgUrl}-${gIdx}`}
                                  className="relative group w-16 h-16 rounded-xl bg-neutral-100 border border-black/15 overflow-hidden flex-shrink-0 flex items-center justify-center"
                                >
                                  <Image
                                    src={imgUrl}
                                    alt={`Gallery ${gIdx + 1}`}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    style={{
                                      width: "64px",
                                      height: "64px",
                                      objectFit: "cover"
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateProductField(
                                        selectedProdIdx,
                                        "gallery",
                                        activeProduct.gallery.filter(
                                          (_, i) => i !== gIdx
                                        )
                                      )
                                    }
                                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                                    title="Remove photo"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="md:col-span-4 bg-white p-4 rounded-2xl border border-black/12 shadow-xs flex flex-col justify-between gap-3">
                            <div>
                              <span className="text-xs font-mono font-black uppercase tracking-wider text-black block">
                                360° Turntable Speed
                              </span>
                              <p className="text-[11px] font-mono text-black/60 mt-0.5">
                                Controls rotation speed on the storefront hero stage.
                              </p>
                            </div>
                            <select
                              id="orbit-speed-select"
                              aria-label="360° Orbit Speed"
                              value={settings.orbitSpeedMultiplier || 1}
                              onChange={(e) =>
                                setSettings((p) => ({
                                  ...p,
                                  orbitSpeedMultiplier:
                                    Number(e.target.value) || 1
                                }))
                              }
                              className="w-full bg-neutral-50 px-3 py-2.5 rounded-xl border border-black/15 font-mono text-xs font-black"
                            >
                              <option value={0.5}>0.5x (Slow Luxury)</option>
                              <option value={1}>1.0x (Standard Smooth)</option>
                              <option value={1.5}>1.5x (Fast Showcase)</option>
                              <option value={2}>2.0x (Dynamic Spin)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------
                        SUB-TAB C: SIZES, STOCK & DANGER ZONE
                       ------------------------------------------------------- */}
                    {productSubTab === "stock" && (
                      <div className="space-y-4">
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3.5">
                          <span className="text-xs font-mono font-black uppercase tracking-wider text-black block border-b border-black/10 pb-2.5">
                            Size Inventory &amp; Available Units (Set{" "}
                            {activeProduct.number})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {activeProduct.sizes.map((s, sIdx) => (
                              <div
                                key={s.size}
                                className="p-3.5 rounded-xl bg-neutral-50 border border-black/10"
                              >
                                <label
                                  htmlFor={`stock-${selectedProdIdx}-${sIdx}`}
                                  className="block text-[10px] font-mono font-bold uppercase text-black/80 truncate mb-1.5"
                                >
                                  {s.size}
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    id={`stock-${selectedProdIdx}-${sIdx}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={s.stock}
                                    onChange={(e) =>
                                      handleUpdateProductStock(
                                        selectedProdIdx,
                                        sIdx,
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/15 font-mono text-sm font-black"
                                  />
                                  <span className="text-[10px] font-mono text-black/50">
                                    pcs
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {products.length > 1 && (
                          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="font-mono">
                              <span className="text-xs font-bold text-red-900 block">
                                Remove Set {activeProduct.number} ({activeProduct.shortName})
                              </span>
                              <span className="text-[11px] text-red-800/75">
                                Deletes this set from the 360° storefront catalog.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(selectedProdIdx)}
                              className="px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 font-mono text-xs font-bold uppercase flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Set {activeProduct.number}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =============================================================
                  TAB 2: ORDERS & FULFILLMENT MANAGER
                 ============================================================= */}
              {activeTab === "orders" && (
                <div className="space-y-4">
                  {/* Search, Channel Filter, Status Filter & Manual Order Bar */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/10 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 flex-1">
                      <div className="relative flex-1 min-w-0 sm:min-w-[220px] sm:max-w-md">
                        <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          aria-label="Search orders by ID, customer name, phone, or AWB"
                          placeholder="Search Order ID, Customer, Phone, City, AWB..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:flex items-center gap-2">
                        <select
                          aria-label="Filter orders by source channel"
                          value={orderChannelFilter}
                          onChange={(e) => setOrderChannelFilter(e.target.value)}
                          className="px-2.5 sm:px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-[11px] sm:text-xs font-bold uppercase min-w-0"
                        >
                          <option value="all">All Channels ({orders.length})</option>
                          <option value="website">Website Checkout</option>
                          <option value="whatsapp">WhatsApp Bot</option>
                          <option value="instagram">Instagram DM</option>
                          <option value="concierge">Concierge Desk</option>
                        </select>

                        <select
                          aria-label="Filter orders by status"
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                          className="px-2.5 sm:px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-[11px] sm:text-xs font-bold uppercase min-w-0"
                        >
                          <option value="all">All Statuses</option>
                          <option value="paid">Paid</option>
                          <option value="processing">Processing</option>
                          <option value="handcrafted">Handcrafted</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNewOrderForm(!showNewOrderForm)}
                      className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#141414] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Create Order (WA / IG / Phone)</span>
                    </button>
                  </div>

                  {/* Collapsible Manual Order Form */}
                  {showNewOrderForm && (
                    <form
                      onSubmit={handleCreateManualOrder}
                      className="bg-white p-5 rounded-2xl border-2 border-amber-600/40 shadow-md space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <span className="font-mono text-xs font-black uppercase tracking-wider">
                          Log Manual / WhatsApp / Instagram DM Order
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNewOrderForm(false)}
                          className="text-xs font-mono text-black/50 hover:text-black"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="manual-name"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Customer Full Name *
                          </label>
                          <input
                            id="manual-name"
                            type="text"
                            required
                            value={newOrderCustomer.fullName}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                fullName: e.target.value
                              }))
                            }
                            placeholder="e.g. Kavya Menon"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="manual-phone"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Mobile / WhatsApp Number *
                          </label>
                          <input
                            id="manual-phone"
                            type="tel"
                            required
                            value={newOrderCustomer.phone}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                phone: e.target.value
                              }))
                            }
                            placeholder="+91 98470 00000"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="manual-source"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Order Source Channel
                          </label>
                          <select
                            id="manual-source"
                            value={newOrderCustomer.source}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                source: e.target.value as
                                  | "website"
                                  | "whatsapp"
                                  | "instagram"
                                  | "concierge"
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold uppercase"
                          >
                            <option value="whatsapp">WhatsApp Order</option>
                            <option value="instagram">Instagram DM Order</option>
                            <option value="concierge">Phone / Concierge</option>
                            <option value="website">Website</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="manual-product"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Beachwear Set
                          </label>
                          <select
                            id="manual-product"
                            value={newOrderCustomer.productId}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                productId: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                Set {p.number}: {p.shortName} (₹{p.price})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="manual-address"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Delivery Address &amp; City
                          </label>
                          <input
                            id="manual-address"
                            type="text"
                            value={newOrderCustomer.addressLine1}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                addressLine1: e.target.value
                              }))
                            }
                            placeholder="Street / Villa / Resort"
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="manual-payment"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Payment Mode (Prepaid Razorpay Only)
                          </label>
                          <select
                            id="manual-payment"
                            value={newOrderCustomer.paymentMethod}
                            onChange={(e) =>
                              setNewOrderCustomer((p) => ({
                                ...p,
                                paymentMethod: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold uppercase"
                          >
                            <option value="razorpay">Razorpay Prepaid</option>
                            <option value="upi">Razorpay UPI (Paid)</option>
                            <option value="card">Razorpay Card (Paid)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-mono text-xs font-black uppercase tracking-wider"
                        >
                          Save &amp; Generate Order
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Orders List */}
                  {filteredOrders.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-black/10 text-center font-mono text-xs text-black/50">
                      No matching orders found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const isBusy = dispatchingOrderId === order.orderId;
                        const channel = order.source || "website";
                        const waNumber = order.customer.phone.replace(/\D/g, "");
                        const waUrl = `https://wa.me/${waNumber.length === 10 ? `91${waNumber}` : waNumber
                          }?text=${encodeURIComponent(
                            `Namaskaram ${order.customer.fullName}! Your APOORVA Beachwear Order #${order.orderId} is ${order.status.toUpperCase()}. Courier: ${order.shipping?.courierName || "Blue Dart"
                            } | AWB: ${order.shipping?.trackingNumber || "Assigned"
                            }. Track live: http://localhost:3000/track?orderId=${order.orderId
                            }`
                          )}`;

                        return (
                          <div
                            key={order.orderId}
                            className="bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-4"
                          >
                            {/* Top Row: Order ID, Source Channel, Status Badge, Payment Mode, Total */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-black text-black bg-neutral-100 px-3 py-1 rounded-lg">
                                  {order.orderId}
                                </span>

                                {/* Channel Badge */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase flex items-center gap-1 ${channel === "whatsapp"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : channel === "instagram"
                                      ? "bg-pink-100 text-pink-900"
                                      : "bg-stone-200 text-stone-800"
                                    }`}
                                >
                                  {channel === "whatsapp" && (
                                    <MessageCircle className="w-3 h-3" />
                                  )}
                                  {channel === "instagram" && (
                                    <Camera className="w-3 h-3" />
                                  )}
                                  <span>{channel}</span>
                                </span>

                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase ${order.status === "delivered"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : order.status === "dispatched" ||
                                      order.status === "out_for_delivery"
                                      ? "bg-blue-100 text-blue-900"
                                      : order.status === "failed" ||
                                        order.status === "cancelled"
                                        ? "bg-red-100 text-red-900"
                                        : "bg-amber-100 text-amber-900"
                                    }`}
                                >
                                  ● {order.status.replace(/_/g, " ").toUpperCase()}
                                </span>

                                <span className="px-2.5 py-0.5 rounded-full bg-black/5 font-mono text-[10px] font-bold uppercase text-black/70">
                                  {order.payment?.method?.toUpperCase() || "UPI"}
                                </span>

                                <span className="text-[11px] font-mono text-black/50">
                                  {new Date(order.createdAt).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    }
                                  )}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-base font-black text-black mr-1">
                                  ₹
                                  {(order.pricing?.total || 0).toLocaleString(
                                    "en-IN"
                                  )}
                                </span>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase flex items-center gap-1"
                                  title="Send Order Update on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>WhatsApp Client</span>
                                </a>

                                {onPrintInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => onPrintInvoice(order)}
                                    className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 font-mono text-[10px] font-bold uppercase flex items-center gap-1"
                                    title="Print GST Invoice & Thermal Label"
                                  >
                                    <Printer className="w-3.5 h-3.5 shrink-0" />
                                    <span>Invoice / Label</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order.orderId)}
                                  className="p-1.5 rounded-xl text-black/40 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Middle Row: Customer Info + Ordered Items */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-5 font-mono text-xs space-y-1 bg-neutral-50 p-3.5 rounded-xl border border-black/8">
                                <div className="font-black text-black uppercase flex items-center justify-between gap-2">
                                  <span>{order.customer.fullName}</span>
                                  {order.socialHandle && (
                                    <span className="text-[10px] text-amber-900 font-bold truncate">
                                      {order.socialHandle}
                                    </span>
                                  )}
                                </div>
                                <div className="text-black/75 break-words">
                                  📞 {order.customer.phone} • ✉️{" "}
                                  {order.customer.email}
                                </div>
                                <div className="text-black/70 text-[11px]">
                                  📍 {order.customer.addressLine1},{" "}
                                  {order.customer.city}, {order.customer.state} —{" "}
                                  <strong>{order.customer.pincode}</strong>
                                </div>
                                {order.customer.orderNotes && (
                                  <div className="text-[10px] text-amber-900 bg-amber-100/70 px-2 py-1 rounded mt-1">
                                    {order.customer.orderNotes}
                                  </div>
                                )}
                              </div>

                              <div className="md:col-span-7 flex flex-col justify-center space-y-2">
                                {order.items.map((item, iIdx) => (
                                  <div
                                    key={`${order.orderId}-item-${iIdx}`}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-50 border border-black/8"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-10 h-10 rounded-lg bg-white border border-black/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        <Image
                                          src={item.image}
                                          alt={item.name}
                                          width={36}
                                          height={36}
                                          unoptimized
                                          style={{
                                            width: "36px",
                                            height: "36px",
                                            objectFit: "contain"
                                          }}
                                        />
                                      </div>
                                      <div className="min-w-0 font-mono">
                                        <div className="text-xs font-bold text-black truncate">
                                          {item.name}
                                        </div>
                                        <div className="text-[10px] text-black/60">
                                          Fit: {item.size} × {item.quantity}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="font-mono text-xs font-black text-black flex-shrink-0">
                                      ₹{item.totalPrice.toLocaleString("en-IN")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Bottom Row: Fulfillment Stage Dropdown, Courier AWB & Dispatch Email */}
                            <div className="pt-2.5 border-t border-black/8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-black/10">
                                <span className="text-[10px] font-mono uppercase text-black/55 font-bold shrink-0">
                                  Order Stage:
                                </span>
                                <select
                                  aria-label="Order Status Stage"
                                  disabled={isBusy}
                                  value={order.status}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(
                                      order,
                                      e.target.value as OrderRecord["status"],
                                      false
                                    )
                                  }
                                  className="bg-transparent font-mono text-xs font-black uppercase text-black focus:outline-none cursor-pointer flex-1"
                                >
                                  {(
                                    [
                                      "paid",
                                      "processing",
                                      "handcrafted",
                                      "dispatched",
                                      "out_for_delivery",
                                      "delivered",
                                      "cancelled"
                                    ] as const
                                  ).map((st) => (
                                    <option key={st} value={st}>
                                      {st.replace(/_/g, " ").toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-black/10 flex-1 sm:flex-initial min-w-[140px]">
                                  <Truck className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                                  <input
                                    type="text"
                                    aria-label="Courier Name"
                                    value={
                                      order.shipping?.courierName ||
                                      "Blue Dart Express"
                                    }
                                    onChange={(e) =>
                                      handleUpdateOrderShippingLocal(
                                        order.orderId,
                                        "courierName",
                                        e.target.value
                                      )
                                    }
                                    className="bg-transparent font-mono text-[11px] font-bold w-full sm:w-32 focus:outline-none min-w-0"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-black/10 flex-1 sm:flex-initial min-w-[130px]">
                                  <span className="text-[10px] font-mono text-black/50 shrink-0">
                                    AWB:
                                  </span>
                                  <input
                                    type="text"
                                    aria-label="AWB Tracking Number"
                                    value={
                                      order.shipping?.trackingNumber ||
                                      "BD-88492019IN"
                                    }
                                    onChange={(e) =>
                                      handleUpdateOrderShippingLocal(
                                        order.orderId,
                                        "trackingNumber",
                                        e.target.value
                                      )
                                    }
                                    className="bg-transparent font-mono text-[11px] font-bold w-full sm:w-28 focus:outline-none min-w-0"
                                  />
                                </div>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      order,
                                      "dispatched",
                                      true
                                    )
                                  }
                                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                                >
                                  <Send className="w-3 h-3 shrink-0" />
                                  <span>
                                    {isBusy
                                      ? "Updating..."
                                      : "Dispatch & Email AWB"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 3: WHATSAPP & INSTAGRAM DM ORDER AUTOMATION HUB
                 ============================================================= */}
              {activeTab === "social" && (
                <div className="space-y-5">
                  {/* Sub-Navigation for WA / IG Automation */}
                  <div className="bg-white p-2 rounded-2xl border border-black/10 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="grid grid-cols-2 gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => setSocialSubTab("bots")}
                        className={`py-2.5 px-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          socialSubTab === "bots"
                            ? "bg-[#141414] text-white shadow-xs"
                            : "bg-neutral-50 text-black/65 hover:text-black hover:bg-black/5"
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>1. Bot Auto-Replies</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSocialSubTab("simulator")}
                        className={`py-2.5 px-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          socialSubTab === "simulator"
                            ? "bg-[#141414] text-white shadow-xs"
                            : "bg-neutral-50 text-black/65 hover:text-black hover:bg-black/5"
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>2. Webhook &amp; Simulator ({socialEvents.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB 1: Bot Configuration (WhatsApp & Instagram) */}
                  {socialSubTab === "bots" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* WhatsApp Business Auto-Order Bot Card */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                              <MessageCircle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-mono text-xs font-black uppercase tracking-wider text-black">
                                WhatsApp Business Order Bot
                              </h3>
                              <span className="text-[10px] font-mono text-black/50 block">
                                Auto-replies with catalog &amp; books orders
                              </span>
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 font-mono text-xs font-bold cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={socialAutomation.whatsappEnabled}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  whatsappEnabled: e.target.checked
                                }))
                              }
                              className="w-4 h-4 accent-emerald-700"
                            />
                            <span>
                              {socialAutomation.whatsappEnabled
                                ? "ACTIVE"
                                : "PAUSED"}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="wa-number"
                              className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                            >
                              WhatsApp Business Number
                            </label>
                            <input
                              id="wa-number"
                              type="text"
                              value={socialAutomation.whatsappBusinessNumber}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  whatsappBusinessNumber: e.target.value
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="wa-phone-id"
                              className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                            >
                              Meta Cloud Phone Number ID
                            </label>
                            <input
                              id="wa-phone-id"
                              type="text"
                              value={socialAutomation.whatsappPhoneId}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  whatsappPhoneId: e.target.value
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="wa-template"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Automated WhatsApp Menu &amp; Order Reply Template
                          </label>
                          <textarea
                            id="wa-template"
                            rows={4}
                            value={socialAutomation.whatsappWelcomeTemplate}
                            onChange={(e) =>
                              setSocialAutomation((p) => ({
                                ...p,
                                whatsappWelcomeTemplate: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Instagram DM & Reel Comment Auto-Order Bot Card */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-pink-700 text-white flex items-center justify-center shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-mono text-xs font-black uppercase tracking-wider text-black">
                                Instagram DM &amp; Reel Auto-Checkout
                              </h3>
                              <span className="text-[10px] font-mono text-black/50 block">
                                Auto-DMs checkout link &amp; completes DM orders
                              </span>
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 font-mono text-xs font-bold cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={socialAutomation.instagramEnabled}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  instagramEnabled: e.target.checked
                                }))
                              }
                              className="w-4 h-4 accent-pink-700"
                            />
                            <span>
                              {socialAutomation.instagramEnabled
                                ? "ACTIVE"
                                : "PAUSED"}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="ig-handle"
                              className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                            >
                              Instagram Brand Handle
                            </label>
                            <input
                              id="ig-handle"
                              type="text"
                              value={socialAutomation.instagramHandle}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  instagramHandle: e.target.value
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="ig-keywords"
                              className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                            >
                              Comment / DM Trigger Keywords
                            </label>
                            <input
                              id="ig-keywords"
                              type="text"
                              value={socialAutomation.instagramTriggerKeywords.join(
                                ", "
                              )}
                              onChange={(e) =>
                                setSocialAutomation((p) => ({
                                  ...p,
                                  instagramTriggerKeywords: e.target.value
                                    .split(",")
                                    .map((k) => k.trim().toUpperCase())
                                    .filter(Boolean)
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="ig-template"
                            className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                          >
                            Automated Instagram DM Checkout Reply Template
                          </label>
                          <textarea
                            id="ig-template"
                            rows={4}
                            value={socialAutomation.instagramDmReplyTemplate}
                            onChange={(e) =>
                              setSocialAutomation((p) => ({
                                ...p,
                                instagramDmReplyTemplate: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: Webhook Endpoints, Simulator & Event Feed */}
                  {socialSubTab === "simulator" && (
                    <div className="space-y-5">
                      {/* Webhook & Meta Cloud API Integration Banner */}
                      <div className="bg-[#141414] text-white p-4 sm:p-5 rounded-2xl space-y-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300 font-bold block">
                            META CLOUD API • MANYCHAT • INTERAKT • WATI READY
                          </span>
                          <h2 className="text-sm font-mono font-black uppercase tracking-wider mt-0.5">
                            WEBHOOK ENDPOINT &amp; VERIFY TOKEN
                          </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-white/10 border border-white/15 font-mono text-xs flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-white/60 block uppercase">
                                Live Webhook Endpoint URL (POST &amp; GET):
                              </span>
                              <code className="text-amber-300 font-bold block truncate">
                                /api/webhooks/social-order
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(
                                  `${window.location.origin}/api/webhooks/social-order`
                                );
                                showToastMessage("success", "Copied Webhook URL!");
                              }}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white flex-shrink-0"
                              title="Copy Webhook URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="p-3 rounded-xl bg-white/10 border border-white/15 font-mono text-xs flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-white/60 block uppercase">
                                Meta Webhook Verify Token (hub.verify_token):
                              </span>
                              <code className="text-emerald-300 font-bold block truncate">
                                {socialAutomation.webhookVerifyToken}
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(
                                  socialAutomation.webhookVerifyToken
                                );
                                showToastMessage("success", "Copied Verify Token!");
                              }}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white flex-shrink-0"
                              title="Copy Verify Token"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Webhook Simulator + Automation Event Feed */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left (5 cols): Test Incoming WhatsApp / Instagram Order */}
                        <form
                          onSubmit={handleRunSocialOrderSimulation}
                          className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3"
                        >
                          <div className="border-b border-black/10 pb-2">
                            <span className="font-mono text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-600" />
                              Test Automated Order Flow
                            </span>
                            <p className="text-[11px] font-mono text-black/60">
                              Simulates an incoming customer message and auto-creates the order + AWB.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label
                                htmlFor="sim-channel"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Channel
                              </label>
                              <select
                                id="sim-channel"
                                value={simChannel}
                                onChange={(e) =>
                                  setSimChannel(
                                    e.target.value as "whatsapp" | "instagram"
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold uppercase"
                              >
                                <option value="whatsapp">WhatsApp Bot</option>
                                <option value="instagram">Instagram DM</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="sim-product"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Product Keyword
                              </label>
                              <select
                                id="sim-product"
                                value={simProduct}
                                onChange={(e) =>
                                  setSimProduct(
                                    e.target.value as "set1" | "set2" | "both"
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                              >
                                <option value="set1">Set 01 (Coir Fringe)</option>
                                <option value="set2">Set 02 (Jute Wrap)</option>
                                <option value="both">Both Sets (15% OFF)</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="sim-name"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Sender Name
                              </label>
                              <input
                                id="sim-name"
                                type="text"
                                value={simName}
                                onChange={(e) => setSimName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="sim-handle"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Phone or @Handle
                              </label>
                              <input
                                id="sim-handle"
                                type="text"
                                value={simHandle}
                                onChange={(e) => setSimHandle(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="sim-city"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Delivery City
                              </label>
                              <input
                                id="sim-city"
                                type="text"
                                value={simCity}
                                onChange={(e) => setSimCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="sim-pay"
                                className="block text-[10px] font-mono uppercase text-black/60 mb-1"
                              >
                                Payment Mode
                              </label>
                              <select
                                id="sim-pay"
                                value={simPayment}
                                onChange={(e) =>
                                  setSimPayment(
                                    e.target.value as "razorpay" | "upi" | "card"
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold uppercase"
                              >
                                <option value="razorpay">Razorpay Link</option>
                                <option value="upi">Razorpay UPI Paid</option>
                                <option value="card">Razorpay Card Paid</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={simRunning}
                            className="w-full py-3 rounded-xl bg-[#141414] hover:bg-black text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <Bot className="w-4 h-4 text-amber-300" />
                            <span>
                              {simRunning
                                ? "Processing Webhook..."
                                : `Simulate ${simChannel.toUpperCase()} Auto-Order`}
                            </span>
                          </button>
                        </form>

                        {/* Right (7 cols): Live Social Automation Log */}
                        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-black/12 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-black/10 pb-2">
                            <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
                              Automated Order Log ({socialEvents.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab("orders")}
                              className="text-[10px] font-mono font-bold underline text-amber-900"
                            >
                              View All in Orders →
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {socialEvents.map((evt) => (
                              <div
                                key={evt.id}
                                className="p-3.5 rounded-xl bg-neutral-50 border border-black/10 font-mono text-xs space-y-1.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        evt.channel === "whatsapp"
                                          ? "bg-emerald-100 text-emerald-900"
                                          : "bg-pink-100 text-pink-900"
                                      }`}
                                    >
                                      {evt.channel}
                                    </span>
                                    <span className="font-bold text-black">
                                      {evt.senderName} ({evt.senderHandleOrPhone})
                                    </span>
                                  </div>
                                  {evt.orderId && (
                                    <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold">
                                      {evt.orderId} • ₹
                                      {(evt.amount || 0).toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-black/70 bg-white p-2 rounded-lg border border-black/5">
                                  <strong>Customer DM:</strong> {evt.incomingMessage}
                                </div>
                                <div className="text-[11px] text-emerald-950 bg-emerald-50 p-2 rounded-lg border border-emerald-900/10">
                                  <strong>Bot Reply:</strong> {evt.automatedReply}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 4: MEDIA LIBRARY & LOOKBOOK EDITOR
                 ============================================================= */}
              {activeTab === "media" && (
                <div className="space-y-5">
                  {/* Sub-Navigation for Media Tab */}
                  <div className="bg-white p-2 rounded-2xl border border-black/10 shadow-xs grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMediaSubTab("library")}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        mediaSubTab === "library"
                          ? "bg-[#141414] text-white shadow-xs"
                          : "bg-neutral-50 text-black/65 hover:text-black hover:bg-black/5"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>1. Media Files ({mediaLibrary.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSubTab("lookbook")}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        mediaSubTab === "lookbook"
                          ? "bg-[#141414] text-white shadow-xs"
                          : "bg-neutral-50 text-black/65 hover:text-black hover:bg-black/5"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>2. Lookbook (4)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSubTab("paths")}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        mediaSubTab === "paths"
                          ? "bg-[#141414] text-white shadow-xs"
                          : "bg-neutral-50 text-black/65 hover:text-black hover:bg-black/5"
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>3. Storage Paths</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: Media Files Library */}
                  {mediaSubTab === "library" && (
                    <div className="space-y-4">
                      {/* Upload & Add URL Bar */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
                        <div>
                          <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
                            All Stored Media Files ({mediaLibrary.length})
                          </h3>
                          <p className="font-mono text-xs text-black/60 mt-0.5">
                            Upload new images or `.mp4` videos, or assign any file to Set 01 / Set 02 with one click.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-2">
                          <form
                            onSubmit={handleAddCustomMediaUrl}
                            className="flex items-center gap-2 w-full sm:w-auto"
                          >
                            <input
                              type="text"
                              aria-label="Media URL"
                              placeholder="Paste external image or .mp4 URL..."
                              value={customMediaUrl}
                              onChange={(e) => setCustomMediaUrl(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs flex-1 sm:w-56 min-w-0"
                            />
                            <button
                              type="submit"
                              className="px-3.5 py-2 rounded-xl bg-black text-white font-mono text-xs font-bold uppercase whitespace-nowrap shrink-0"
                            >
                              Add URL
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => triggerUploadForField()}
                            disabled={uploading}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {uploading
                                ? "Uploading..."
                                : "Upload to /public/uploads"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Media Library Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                        {mediaLibrary.map((asset) => (
                          <div
                            key={asset.id}
                            className="bg-white rounded-2xl border border-black/12 overflow-hidden shadow-xs flex flex-col justify-between"
                          >
                            <div className="h-36 bg-[#181512] relative flex items-center justify-center overflow-hidden">
                              {asset.type === "video" ? (
                                <video
                                  src={asset.url}
                                  muted
                                  loop
                                  autoPlay
                                  playsInline
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                  }}
                                />
                              ) : (
                                <Image
                                  src={asset.url}
                                  alt={asset.name}
                                  width={140}
                                  height={140}
                                  unoptimized
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    padding: "6px"
                                  }}
                                />
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 text-white font-mono text-[9px] uppercase font-bold">
                                {asset.type}
                              </span>
                              {!asset.url.startsWith("/images/") &&
                                !asset.url.startsWith("/videos/") && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMediaAsset(asset)}
                                    title="Permanently delete media file from storage"
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white shadow-sm transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              {asset.sizeKB ? (
                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-amber-300 font-mono text-[9px]">
                                  {asset.sizeKB} KB
                                </span>
                              ) : null}
                            </div>

                            <div className="p-2.5 space-y-1.5">
                              <div
                                className="font-mono text-[10px] font-bold text-black truncate"
                                title={asset.diskPath}
                              >
                                {asset.name}
                              </div>
                              <div
                                className="font-mono text-[9px] text-black/50 truncate"
                                title={asset.diskPath}
                              >
                                📁 {asset.folder}
                              </div>

                              <div className="grid grid-cols-2 gap-1 pt-1">
                                {asset.type === "video" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateProductField(
                                          0,
                                          "video",
                                          asset.url
                                        );
                                        showToastMessage(
                                          "success",
                                          `Assigned ${asset.name} as Set 01 Video! Click Save Changes.`
                                        );
                                      }}
                                      className="py-1 px-1.5 rounded bg-black/5 hover:bg-black hover:text-white font-mono text-[9px] font-bold uppercase transition-colors"
                                    >
                                      Use Set 01
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateProductField(
                                          1,
                                          "video",
                                          asset.url
                                        );
                                        showToastMessage(
                                          "success",
                                          `Assigned ${asset.name} as Set 02 Video! Click Save Changes.`
                                        );
                                      }}
                                      className="py-1 px-1.5 rounded bg-black/5 hover:bg-black hover:text-white font-mono text-[9px] font-bold uppercase transition-colors"
                                    >
                                      Use Set 02
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateProductField(
                                          0,
                                          "image",
                                          asset.url
                                        );
                                        showToastMessage(
                                          "success",
                                          `Assigned ${asset.name} to Set 01 360° Cutout! Click Save Changes.`
                                        );
                                      }}
                                      className="py-1 px-1.5 rounded bg-black/5 hover:bg-black hover:text-white font-mono text-[9px] font-bold uppercase transition-colors"
                                    >
                                      360° Set 01
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateProductField(
                                          1,
                                          "image",
                                          asset.url
                                        );
                                        showToastMessage(
                                          "success",
                                          `Assigned ${asset.name} to Set 02 360° Cutout! Click Save Changes.`
                                        );
                                      }}
                                      className="py-1 px-1.5 rounded bg-black/5 hover:bg-black hover:text-white font-mono text-[9px] font-bold uppercase transition-colors"
                                    >
                                      360° Set 02
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: 4 Beachwear Lookbook Moments Editor */}
                  {mediaSubTab === "lookbook" && (
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2">
                        <span className="font-mono text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-800 shrink-0" />
                          <span>Beachwear Lookbook Moments (4 Lifestyle Cards)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {beachMoments.map((moment, mIdx) => (
                          <div
                            key={moment.id}
                            className="p-3 rounded-2xl bg-neutral-50 border border-black/10 space-y-2.5"
                          >
                            <div className="h-36 rounded-xl overflow-hidden bg-black relative">
                              <Image
                                src={moment.image}
                                alt={moment.title}
                                width={220}
                                height={144}
                                unoptimized
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaPickerTarget({
                                    label: `Change Photo for ${moment.title}`,
                                    filterType: "image",
                                    onSelect: (url) =>
                                      setBeachMoments((prev) =>
                                        prev.map((m, i) =>
                                          i === mIdx ? { ...m, image: url } : m
                                        )
                                      )
                                  })
                                }
                                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/80 text-white font-mono text-[9px] font-bold uppercase"
                              >
                                Change Photo
                              </button>
                            </div>

                            <div>
                              <label
                                htmlFor={`moment-occ-${mIdx}`}
                                className="block text-[9px] font-mono uppercase text-black/50"
                              >
                                Occasion Tag
                              </label>
                              <input
                                id={`moment-occ-${mIdx}`}
                                type="text"
                                value={moment.occasion}
                                onChange={(e) =>
                                  setBeachMoments((prev) =>
                                    prev.map((m, i) =>
                                      i === mIdx
                                        ? { ...m, occasion: e.target.value }
                                        : m
                                    )
                                  )
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-black/15 font-mono text-[11px] font-bold"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`moment-title-${mIdx}`}
                                className="block text-[9px] font-mono uppercase text-black/50"
                              >
                                Card Title
                              </label>
                              <input
                                id={`moment-title-${mIdx}`}
                                type="text"
                                value={moment.title}
                                onChange={(e) =>
                                  setBeachMoments((prev) =>
                                    prev.map((m, i) =>
                                      i === mIdx
                                        ? { ...m, title: e.target.value }
                                        : m
                                    )
                                  )
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-black/15 font-mono text-[11px] font-bold"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`moment-prod-${mIdx}`}
                                className="block text-[9px] font-mono uppercase text-black/50"
                              >
                                1-Click Buy Linked Set
                              </label>
                              <select
                                id={`moment-prod-${mIdx}`}
                                value={moment.productId}
                                onChange={(e) =>
                                  setBeachMoments((prev) =>
                                    prev.map((m, i) =>
                                      i === mIdx
                                        ? { ...m, productId: e.target.value }
                                        : m
                                    )
                                  )
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-black/15 font-mono text-[11px] font-bold"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    Set {p.number}: {p.shortName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: Server Storage Paths & OCI Cloud Storage */}
                  {mediaSubTab === "paths" && (
                    <div className="space-y-4">
                      <div className="bg-[#141414] text-white p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-amber-300" />
                          <h2 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider">
                            WHERE YOUR MEDIA &amp; STORE DATA ARE STORED ON DISK
                          </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                            <span className="text-[10px] text-amber-300 font-bold uppercase block">
                              1. Built-In 360° Cutouts &amp; Beach Photos:
                            </span>
                            <code className="text-white break-all text-[11px]">
                              {storagePaths.builtInImagesDir}
                            </code>
                            <span className="block text-[10px] text-white/60 mt-0.5">
                              Served publicly at: <code>/images/...</code>
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                            <span className="text-[10px] text-amber-300 font-bold uppercase block">
                              2. Built-In Product Motion Videos (.mp4):
                            </span>
                            <code className="text-white break-all text-[11px]">
                              {storagePaths.builtInVideosDir}
                            </code>
                            <span className="block text-[10px] text-white/60 mt-0.5">
                              Served publicly at: <code>/videos/...</code>
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                              3. New Images &amp; Videos Uploaded via Admin Panel:
                            </span>
                            <code className="text-white break-all text-[11px]">
                              {storagePaths.adminUploadsDir}
                            </code>
                            <span className="block text-[10px] text-white/60 mt-0.5">
                              Served publicly at: <code>/uploads/...</code> (or OCI Bucket when enabled)
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                              4. Persistent Store Database (Pricing, Orders, Bots):
                            </span>
                            <code className="text-white break-all text-[11px]">
                              {storagePaths.databaseJsonFile}
                            </code>
                            <span className="block text-[10px] text-white/60 mt-0.5">
                              Auto-saved JSON file updated on every change
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Instant-Approval Free Cloud Storage Providers Box */}
                      <div className="bg-white p-5 rounded-2xl border border-black/12 shadow-xs space-y-4 font-mono">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2.5">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-amber-800 font-bold block">
                              NO CREDIT CARD NEEDED • AUTO-DETECTED BY ADMIN UPLOADER
                            </span>
                            <h3 className="text-xs sm:text-sm font-black uppercase text-black">
                              Free Cloud Media Storage (Vercel Blob • Cloudinary • Supabase)
                            </h3>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase">
                            Ready Out of the Box
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/10 space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-black block">
                              Option A: Vercel Blob (1-Click, No Card)
                            </span>
                            <p className="text-[11px] text-black/65">
                              In Vercel Dashboard → <strong>Storage → Create Database → Blob</strong>. Automatically adds:
                            </p>
                            <code className="block text-[10px] bg-white p-2 rounded border border-black/10 text-black">
                              BLOB_READ_WRITE_TOKEN=...
                            </code>
                          </div>

                          <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/10 space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-black block">
                              Option B: Cloudinary (25 GB Free, No Card)
                            </span>
                            <p className="text-[11px] text-black/65">
                              Sign in with Google/GitHub at <code>cloudinary.com</code> and add in Vercel:
                            </p>
                            <code className="block text-[10px] bg-white p-2 rounded border border-black/10 text-black">
                              CLOUDINARY_CLOUD_NAME=...
                              <br />
                              CLOUDINARY_API_KEY=...
                              <br />
                              CLOUDINARY_API_SECRET=...
                            </code>
                          </div>

                          <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/10 space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-black block">
                              Option C: Supabase Storage (1 GB Free, No Card)
                            </span>
                            <p className="text-[11px] text-black/65">
                              Sign in with GitHub at <code>supabase.com</code>, create public bucket <code>apoorva-media</code>:
                            </p>
                            <code className="block text-[10px] bg-white p-2 rounded border border-black/10 text-black">
                              SUPABASE_URL=...
                              <br />
                              SUPABASE_SERVICE_ROLE_KEY=...
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 5: SECURITY (ADMIN PASSWORD) & STORE SETTINGS
                 ============================================================= */}
              {activeTab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Storefront Settings */}
                  <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-black/10 pb-3">
                      <div>
                        <h2 className="font-mono text-sm font-black uppercase tracking-wider text-black">
                          Storefront &amp; 360° Showcase Settings
                        </h2>
                        <p className="font-mono text-xs text-black/60">
                          Configure header capsule banner, 360° orbit speed, and support contacts.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="setting-capsule"
                          className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                        >
                          Header Capsule Subtitle
                        </label>
                        <input
                          id="setting-capsule"
                          type="text"
                          value={settings.capsuleTitle}
                          onChange={(e) =>
                            setSettings((p) => ({
                              ...p,
                              capsuleTitle: e.target.value
                            }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-email"
                          className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                        >
                          Concierge Support Email
                        </label>
                        <input
                          id="setting-email"
                          type="email"
                          value={settings.supportEmail}
                          onChange={(e) =>
                            setSettings((p) => ({
                              ...p,
                              supportEmail: e.target.value
                            }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-phone"
                          className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                        >
                          Concierge WhatsApp / Phone
                        </label>
                        <input
                          id="setting-phone"
                          type="tel"
                          value={settings.supportPhone}
                          onChange={(e) =>
                            setSettings((p) => ({
                              ...p,
                              supportPhone: e.target.value
                            }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                        />
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          className="px-3.5 py-2 rounded-full border border-red-700/30 text-red-800 hover:bg-red-50 font-mono text-[10px] font-bold uppercase"
                        >
                          Reset Store to Factory Defaults
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveAll}
                          disabled={saving}
                          className="px-5 py-2.5 rounded-full bg-[#141414] text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2"
                        >
                          <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>Save Settings</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Admin Password Security Card */}
                  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-black/10 shadow-xs space-y-5">
                    <div className="border-b border-black/10 pb-3">
                      <h2 className="font-mono text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-800 shrink-0" />
                        <span>/admin Password Protection</span>
                      </h2>
                      <p className="font-mono text-xs text-black/60 mt-0.5">
                        Update the password required to unlock <code>/admin</code>.
                      </p>
                    </div>

                    <form
                      onSubmit={handleChangeAdminPassword}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="new-admin-pass"
                          className="block text-[10px] font-mono uppercase font-bold text-black/70 mb-1"
                        >
                          New Administrator Password
                        </label>
                        <input
                          id="new-admin-pass"
                          type="password"
                          autoComplete="new-password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Enter new password (min 4 chars)..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-black/15 font-mono text-xs"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-4 py-2 rounded-full bg-red-50 text-red-800 border border-red-200 font-mono text-xs font-bold uppercase flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5 shrink-0" />
                          <span>Lock / Logout Now</span>
                        </button>

                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase tracking-wider"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =====================================================================
          MEDIA LIBRARY PICKER MODAL (FOR ASSIGNING IMAGES / VIDEOS)
         ===================================================================== */}
      {mediaPickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl border border-black/20 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] sm:max-h-[85dvh]">
            <div className="px-4 sm:px-5 py-3.5 bg-[#141414] text-white flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider truncate">
                {mediaPickerTarget.label}
              </span>
              <button
                type="button"
                onClick={() => setMediaPickerTarget(null)}
                className="p-1 rounded-full hover:bg-white/10 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 sm:p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mediaLibrary
                .filter(
                  (m) =>
                    !mediaPickerTarget.filterType ||
                    m.type === mediaPickerTarget.filterType
                )
                .map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      mediaPickerTarget.onSelect(asset.url);
                      setMediaPickerTarget(null);
                      showToastMessage(
                        "success",
                        `Selected ${asset.name}! Click "Save & Publish Live" to apply.`
                      );
                    }}
                    className="bg-white rounded-2xl border border-black/15 hover:border-amber-600 overflow-hidden text-left transition-all group"
                  >
                    <div className="h-32 bg-[#181512] flex items-center justify-center overflow-hidden">
                      {asset.type === "video" ? (
                        <video
                          src={asset.url}
                          muted
                          loop
                          autoPlay
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <Image
                          src={asset.url}
                          alt={asset.name}
                          width={120}
                          height={120}
                          unoptimized
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: "6px"
                          }}
                        />
                      )}
                    </div>
                    <div className="p-2 font-mono text-[10px] font-bold truncate group-hover:text-amber-800">
                      {asset.name}
                    </div>
                    <div className="px-2 pb-2 font-mono text-[9px] text-black/50 truncate">
                      {asset.folder}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
