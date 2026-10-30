"use client";

import React, { useState, useEffect } from "react";
import { PRODUCTS, BEACH_MOMENTS, Product, BeachMoment } from "@/data/products";
import Header from "@/components/Header";
import HeroShowcase from "@/components/HeroShowcase";
import ProductQuickView from "@/components/ProductQuickView";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import CheckoutModal from "@/components/CheckoutModal";
import NotificationCenterModal from "@/components/NotificationCenterModal";
import TrackingModal from "@/components/TrackingModal";
import PrintableInvoiceModal from "@/components/PrintableInvoiceModal";
import { OrderRecord } from "@/lib/types/checkout";
import { StoreSettings } from "@/lib/store/adminStore";

export default function Home() {
  const [storeProducts, setStoreProducts] = useState<Product[]>(PRODUCTS);
  const [storeMoments, setStoreMoments] = useState<BeachMoment[]>(BEACH_MOMENTS);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    capsuleTitle: "ALUVA, KERALA // 360° ROUNDING BEACHWEAR SHOWCASE",
    bundleDiscountPercent: 15,
    enableCod: false,
    enableUpi: true,
    freeShipping: true,
    supportEmail: "concierge@apoorva.luxury",
    supportPhone: "+91 98470 89421",
    orbitSpeedMultiplier: 1
  });

  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: PRODUCTS[0],
      size: "FREE SIZE (Adjustable Tie)",
      quantity: 1
    }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRecord | null>(null);
  const [activePincode, setActivePincode] = useState<string | undefined>(undefined);
  const [trackingQuery, setTrackingQuery] = useState("APV-89421");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<OrderRecord | null>(null);

  // Sync live catalog, pricing & media from Admin Store on mount
  useEffect(() => {
    let active = true;
    fetch("/api/admin/store", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (Array.isArray(data.products) && data.products.length > 0) {
          setStoreProducts(data.products);
          setCartItems((prev) =>
            prev.map((item) => {
              const updatedProd =
                data.products.find((p: Product) => p.id === item.product.id) ||
                item.product;
              return { ...item, product: updatedProd };
            })
          );
        }
        if (Array.isArray(data.beachMoments) && data.beachMoments.length > 0) {
          setStoreMoments(data.beachMoments);
        }
        if (data.settings) {
          setStoreSettings(data.settings);
        }
      })
      .catch(() => {
        // Keep initial defaults if offline
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAddToCart = (product: Product, size: string) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.size === size
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, size, quantity: 1 }];
    });
  };

  // Super-Easy 1-Click Direct Buy for either Beachwear Product
  const handleInstantBuy = (product: Product, size: string) => {
    setCartItems([
      {
        product,
        size: size || "FREE SIZE (Adjustable Tie)",
        quantity: 1
      }
    ]);
    setAppliedDiscount(0);
    setQuickViewProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // 1-Click Buy Both Beachwear Products Bundle
  const handleBuyBothBundle = () => {
    setCartItems(
      storeProducts.map((p) => ({
        product: p,
        size: "FREE SIZE (Adjustable Tie)",
        quantity: 1
      }))
    );
    setAppliedDiscount(storeSettings.bundleDiscountPercent || 15);
    setQuickViewProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (
    productId: string,
    size: string,
    delta: number
  ) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId && i.size === size) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string, size: string) => {
    setCartItems((prev) =>
      prev.filter(
        (i) => !(i.product.id === productId && i.size === size)
      )
    );
  };

  const handleApplyPromoCode = (code: string) => {
    const c = code.trim().toUpperCase();
    if (
      c === "APOORVA-VIP15" ||
      c === "APOORVA15" ||
      c === "VIP15" ||
      c === "BEACH15"
    ) {
      setAppliedDiscount(storeSettings.bundleDiscountPercent || 15);
      return true;
    }
    return false;
  };

  const handleSearchSelect = (query: string) => {
    const q = query.toLowerCase();
    if (q.includes("jute") || q.includes("wrap") || q.includes("02")) {
      setQuickViewProduct(storeProducts[1] || storeProducts[0]);
    } else {
      setQuickViewProduct(storeProducts[0]);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#e8e4dc] text-[#141414] relative selection:bg-amber-900 selection:text-white">
      {/* APOORVA Beachwear Header with Custom Logo & Fast 1-Click Buy */}
      <Header
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenFastBuy={() => setIsCheckoutOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenTracking={() => {
          setTrackingQuery(lastConfirmedOrder?.orderId || "APV-89421");
          setIsTrackingOpen(true);
        }}
        onSearchSelect={handleSearchSelect}
        activeCapsule={storeSettings.capsuleTitle}
      />

      {/* Hero Dual-Product 360° Smooth Rounding Showcase + Product Videos + 1-Click Buy */}
      <HeroShowcase
        products={storeProducts}
        beachMoments={storeMoments}
        bundleDiscountPercent={storeSettings.bundleDiscountPercent}
        orbitSpeedMultiplier={storeSettings.orbitSpeedMultiplier}
        onQuickView={(prod) => setQuickViewProduct(prod)}
        onAddToCart={handleAddToCart}
        onInstantBuy={handleInstantBuy}
        onBuyBothBundle={handleBuyBothBundle}
      />

      {/* Technical Garment Specs & Video Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(prod, size) => {
          handleAddToCart(prod, size);
        }}
        onInstantBuy={(prod, size) => {
          handleInstantBuy(prod, size);
        }}
      />

      {/* Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        appliedDiscount={appliedDiscount}
        onApplyPromoCode={handleApplyPromoCode}
        onStartCheckout={(pincode) => {
          if (pincode) setActivePincode(pincode);
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 1-Step Express Beachwear Checkout Modal (Razorpay Prepaid Only) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        catalogProducts={storeProducts}
        appliedDiscount={appliedDiscount}
        onSelectQuickItems={(newItems, discount) => {
          setCartItems(newItems);
          if (typeof discount === "number") setAppliedDiscount(discount);
        }}
        initialPincode={activePincode}
        onOrderSuccess={(order) => {
          setLastConfirmedOrder(order);
          setInvoiceOrder(order);
        }}
        onOpenNotificationCenter={() => {
          setIsCheckoutOpen(false);
          setIsNotificationOpen(true);
        }}
        onOpenTracking={(orderId) => {
          setTrackingQuery(orderId);
          setIsTrackingOpen(true);
        }}
        onOpenInvoice={(order) => {
          setInvoiceOrder(order);
          setIsInvoiceOpen(true);
        }}
      />

      {/* Email Notification System & Activity Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Live Shipment & Courier Transit Tracking Modal */}
      <TrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialQuery={trackingQuery}
        onOpenInvoice={() => {
          setIsTrackingOpen(false);
          setIsInvoiceOpen(true);
        }}
      />

      {/* Printable Thermal Label & Indian GST Tax Invoice Modal */}
      <PrintableInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        order={invoiceOrder || lastConfirmedOrder}
      />
    </main>
  );
}
