"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Truck,
  Sparkles,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Zap
} from "lucide-react";
import { CartItem } from "./CartDrawer";
import ApoorvaLogo from "./ApoorvaLogo";
import { PRODUCTS, Product } from "@/data/products";
import { CustomerDetails, OrderRecord } from "@/lib/types/checkout";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  catalogProducts?: Product[];
  appliedDiscount: number;
  onSelectQuickItems?: (newItems: CartItem[], discount?: number) => void;
  onOrderSuccess: (order: OrderRecord) => void;
  onOpenNotificationCenter: () => void;
  onOpenTracking?: (orderId: string) => void;
  onOpenInvoice?: (order: OrderRecord) => void;
  initialPincode?: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  catalogProducts = PRODUCTS,
  appliedDiscount,
  onSelectQuickItems,
  onOrderSuccess,
  onOpenNotificationCenter,
  onOpenTracking,
  onOpenInvoice,
  initialPincode
}: CheckoutModalProps) {
  const [step, setStep] = useState<
    "express" | "processing" | "success" | "failed"
  >("express");

  // Customer Delivery Details
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "Aluva",
    state: "Kerala",
    pincode: initialPincode || "683101",
    country: "India",
    orderNotes: ""
  });

  // Field-level blur validation errors (cleared on input per modern-web-guidance `forms`)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [resolvedDeliveryInfo, setResolvedDeliveryInfo] = useState<
    string | null
  >(null);

  // Processing & Order State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(
    "Connecting to Razorpay Secure Payment Gateway..."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(
    null
  );
  const [copiedId, setCopiedId] = useState(false);
  const [isDispatchingNotification, setIsDispatchingNotification] =
    useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialPincode) {
      setCustomer((prev) => ({ ...prev, pincode: initialPincode }));
    }
  }, [initialPincode]);

  // Real-time PIN code auto-fill City, State, & Delivery Date
  useEffect(() => {
    const pin = customer.pincode?.replace(/\D/g, "");
    if (pin && pin.length === 6) {
      setPincodeLoading(true);
      fetch(`/api/shipping/pincode?pincode=${pin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCustomer((prev) => ({
              ...prev,
              city: data.city,
              state: data.state
            }));
            setResolvedDeliveryInfo(
              `Express Delivery by ${data.estimatedDelivery} to ${data.city}, ${data.state} (${data.courier})`
            );
          }
        })
        .catch(() => {})
        .finally(() => setPincodeLoading(false));
    } else {
      setResolvedDeliveryInfo(null);
    }
  }, [customer.pincode]);

  useEffect(() => {
    if (!isOpen) {
      setStep("express");
      setErrorMessage(null);
      setFieldErrors({});
      setProcessingStatus("");
      setDispatchStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Pricing computations
  const activeItems: CartItem[] =
    items.length > 0
      ? items
      : [
          {
            product: catalogProducts[0] || PRODUCTS[0],
            size: "FREE SIZE (Adjustable Tie)",
            quantity: 1
          }
        ];

  const rawSubtotal = activeItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountAmount = Math.round((rawSubtotal * appliedDiscount) / 100);
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const freeShippingThreshold = 4000;
  const shippingFee =
    subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 250;
  const total = subtotal + shippingFee;

  // Reset field error immediately on input (per modern-web-guidance `forms`)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (errorMessage) setErrorMessage(null);
  };

  // Validate individual field on blur (per modern-web-guidance `forms`)
  const handleFieldBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const trimmed = value.trim();
    if (name === "fullName" && !trimmed) {
      setFieldErrors((prev) => ({
        ...prev,
        fullName: "Please enter your name."
      }));
    } else if (name === "phone" && trimmed.replace(/\D/g, "").length < 10) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Enter a valid 10-digit mobile number."
      }));
    } else if (name === "pincode" && !/^\d{6}$/.test(trimmed)) {
      setFieldErrors((prev) => ({
        ...prev,
        pincode: "Enter a 6-digit Indian PIN code."
      }));
    } else if (name === "addressLine1" && trimmed.length < 5) {
      setFieldErrors((prev) => ({
        ...prev,
        addressLine1: "Please enter your delivery street address."
      }));
    }
  };

  const handleQuickFillDemo = () => {
    setCustomer({
      fullName: "Nisha & Vivek",
      email: "nisha.beachwear@example.com",
      phone: "+91 98470 12345",
      addressLine1: "Periyar River View Villa 14, Aluva Palace Road",
      addressLine2: "",
      city: "Aluva",
      state: "Kerala",
      pincode: "683101",
      country: "India",
      orderNotes: "Gift wrap in resort box with hibiscus flower note."
    });
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleQuickSelectProduct = (prod: Product) => {
    if (!onSelectQuickItems) return;
    onSelectQuickItems(
      [{ product: prod, size: "FREE SIZE (Adjustable Tie)", quantity: 1 }],
      0
    );
  };

  const handleQuickSelectBundle = () => {
    if (!onSelectQuickItems) return;
    onSelectQuickItems(
      catalogProducts.slice(0, 2).map((p) => ({
        product: p,
        size: "FREE SIZE (Adjustable Tie)",
        quantity: 1
      })),
      15
    );
  };

  const handleOneStepOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const errors: Record<string, string> = {};
    if (!customer.fullName.trim()) errors.fullName = "Please enter your name.";
    if (customer.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Enter a valid 10-digit mobile number.";
    }
    if (!/^\d{6}$/.test(customer.pincode.trim())) {
      errors.pincode = "Enter a valid 6-digit PIN code.";
    }
    if (!customer.addressLine1.trim()) {
      errors.addressLine1 = "Please enter your delivery address.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please fill the highlighted delivery details above.");
      return;
    }

    const finalCustomer: CustomerDetails = {
      ...customer,
      email:
        customer.email.trim() ||
        `${customer.phone.replace(/\D/g, "").slice(-10)}@apoorva.store`
    };

    setIsProcessing(true);
    setErrorMessage(null);
    setStep("processing");

    try {
      setProcessingStatus("Initializing Razorpay payment session...");

      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: activeItems.map((i) => ({
            productId: i.product.id,
            size: i.size,
            quantity: i.quantity
          })),
          customer: finalCustomer,
          appliedDiscount
        })
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || "Failed to create Razorpay order");
      }

      const orderData = await createRes.json();
      const {
        orderId: razorpayOrderId,
        isSandbox,
        isLiveConfigured,
        keyId,
        amount,
        currency
      } = orderData;

      // If live Razorpay Checkout SDK is loaded and configured, open Razorpay modal
      if (isLiveConfigured && typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency: currency || "INR",
          name: "APOORVA Coastal Beachwear",
          description: "Aluva, Kerala Artisanal Beachwear Acquisition",
          order_id: razorpayOrderId,
          prefill: {
            name: finalCustomer.fullName,
            email: finalCustomer.email,
            contact: finalCustomer.phone
          },
          theme: {
            color: "#141414"
          },
          handler: async (response) => {
            setProcessingStatus(
              "Verifying Razorpay cryptographic signature & generating GST invoice..."
            );
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer: finalCustomer,
                items: orderData.items,
                pricing: orderData.pricing,
                paymentMethod: "razorpay",
                isSandbox: false
              })
            });
            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok) {
              setErrorMessage(
                verifyResult.error || "Payment verification failed"
              );
              setStep("failed");
              setIsProcessing(false);
              return;
            }
            setConfirmedOrder(verifyResult.order);
            onOrderSuccess(verifyResult.order);
            setStep("success");
            setIsProcessing(false);
          },
          modal: {
            ondismiss: () => {
              setStep("express");
              setIsProcessing(false);
            }
          }
        });
        rzp.open();
        return;
      }

      // Razorpay Sandbox / Instant Gateway Verification
      setProcessingStatus(
        "Verifying Razorpay prepaid payment & generating GST tax invoice..."
      );
      await new Promise((r) => setTimeout(r, 650));

      const mockPaymentId = `pay_rzp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const mockSignature = `sig_sim_${Math.random().toString(36).slice(2, 10)}`;

      const verifyRes = await fetch("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
          customer: finalCustomer,
          items: orderData.items,
          pricing: orderData.pricing,
          paymentMethod: "razorpay",
          isSandbox
        })
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.json();
        throw new Error(verifyErr.error || "Order verification failed");
      }

      const verifyResult = await verifyRes.json();
      setConfirmedOrder(verifyResult.order);
      onOrderSuccess(verifyResult.order);
      setStep("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Order placement failed";
      setErrorMessage(msg);
      setStep("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateShippingDispatch = async () => {
    if (!confirmedOrder) return;
    setIsDispatchingNotification(true);
    setDispatchStatus("Sending Blue Dart Express tracking notification...");

    try {
      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: confirmedOrder,
          trackingNumber:
            confirmedOrder.shipping?.trackingNumber || "BD-88492019IN",
          courierName: "Blue Dart Express",
          trackingUrl: "https://www.bluedart.com"
        })
      });

      if (res.ok) {
        setDispatchStatus(
          "✓ Courier dispatch email sent to " + confirmedOrder.customer.email
        );
      } else {
        setDispatchStatus("Simulation recorded in Notification Center.");
      }
    } catch {
      setDispatchStatus("Simulated courier dispatch recorded.");
    } finally {
      setIsDispatchingNotification(false);
    }
  };

  const handleCopyOrderId = () => {
    if (confirmedOrder?.orderId) {
      navigator.clipboard.writeText(confirmedOrder.orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isBothSets = activeItems.length >= 2;
  const bundlePreviewPrice =
    catalogProducts.length >= 2
      ? Math.round(
          (catalogProducts[0].price + catalogProducts[1].price) * 0.85
        )
      : total;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))"
      }}
      className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div
        style={{
          maxHeight:
            "calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
        }}
        className="relative w-full max-w-2xl bg-white text-[#141414] rounded-3xl shadow-2xl border border-black/15 flex flex-col overflow-hidden overscroll-contain"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-neutral-50 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ApoorvaLogo size="sm" showTagline={false} />
            <div className="border-l border-black/15 pl-3">
              <h2
                id="checkout-title"
                className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-black"
              >
                {step === "success"
                  ? "BEACHWEAR ORDER CONFIRMED"
                  : "1-STEP EXPRESS RAZORPAY CHECKOUT"}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-black/65">
                <span className="flex items-center gap-1 text-emerald-800 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Prepaid via
                  Razorpay
                </span>
                <span>•</span>
                <span>Dispatched from Aluva, Kerala</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
            title="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === "express" && (
            <form
              action="/api/checkout/create-order"
              method="POST"
              onSubmit={handleOneStepOrderSubmit}
              className="space-y-4 font-mono"
              noValidate
            >
              {/* 1-Tap Switcher between Products or Bundle */}
              {onSelectQuickItems && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-black/70">
                      1. TAP TO SELECT BEACHWEAR SET:
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickFillDemo}
                      className="text-[10px] font-mono font-bold text-amber-950 bg-amber-300/60 hover:bg-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>⚡ 1-Tap Auto-Fill Demo</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {catalogProducts.map((prod) => {
                      const isSelected =
                        activeItems.length === 1 &&
                        activeItems[0].product.id === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleQuickSelectProduct(prod)}
                          className={`p-2 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-black text-white border-black shadow-sm"
                              : "bg-white/80 hover:bg-white text-black border-black/15"
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase truncate">
                            {prod.number}. {prod.shortName}
                          </div>
                          <div className="text-xs font-bold text-amber-500">
                            ₹{prod.price.toLocaleString("en-IN")}
                          </div>
                        </button>
                      );
                    })}

                    {catalogProducts.length >= 2 && (
                      <button
                        type="button"
                        onClick={handleQuickSelectBundle}
                        className={`p-2 rounded-2xl border text-left transition-all ${
                          isBothSets
                            ? "bg-amber-900 text-white border-amber-950 shadow-sm"
                            : "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300"
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase truncate">
                          Both Sets (15% Off)
                        </div>
                        <div className="text-xs font-bold">
                          ₹{bundlePreviewPrice.toLocaleString("en-IN")}
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Product Snapshot */}
              <div className="p-3 bg-white/85 rounded-2xl border border-black/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0 border border-black/10 flex items-center justify-center">
                    <Image
                      src={
                        activeItems[0]?.product.image ||
                        "/images/apoorva_model_editorial.png"
                      }
                      alt={activeItems[0]?.product.name || "Beachwear Set"}
                      width={44}
                      height={44}
                      unoptimized
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "contain"
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black uppercase text-[11px] truncate">
                      {activeItems.length === 1
                        ? activeItems[0].product.name
                        : `Beachwear Bundle (${activeItems.length} Sets)`}
                    </div>
                    <div className="text-[10px] text-black/65 truncate">
                      {activeItems
                        .map((i) => `${i.product.shortName} • ${i.size}`)
                        .join(" + ")}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-black text-sm">
                    ₹{total.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[9px] text-emerald-800 font-bold uppercase">
                    PREPAID • FREE SHIPPING
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3 bg-red-100 border border-red-300 text-red-950 rounded-xl text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 2: DELIVERY ADDRESS FIELDS */}
              <fieldset className="space-y-3 border border-black/10 rounded-2xl p-3.5 bg-white/60">
                <legend className="text-[10px] uppercase tracking-wider font-bold text-black/80 px-1.5">
                  2. DELIVERY ADDRESS DETAILS:
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label
                      htmlFor="checkout-full-name"
                      className="block text-[11px] text-black/80 uppercase mb-1 font-bold"
                    >
                      Full Name *
                    </label>
                    <input
                      id="checkout-full-name"
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      enterKeyHint="next"
                      required
                      value={customer.fullName}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      aria-describedby={
                        fieldErrors.fullName ? "err-fullName" : undefined
                      }
                      placeholder="e.g. Nisha Menon"
                      className="w-full bg-white border border-black/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    />
                    {fieldErrors.fullName && (
                      <p
                        id="err-fullName"
                        className="text-[10px] text-red-700 font-bold mt-1"
                      >
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-[11px] text-black/80 uppercase mb-1 font-bold"
                    >
                      Mobile / WhatsApp Number *
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      name="phone"
                      inputMode="tel"
                      autoComplete="tel"
                      enterKeyHint="next"
                      required
                      value={customer.phone}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      aria-describedby={
                        fieldErrors.phone ? "err-phone" : undefined
                      }
                      placeholder="+91 98470 12345"
                      className="w-full bg-white border border-black/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    />
                    {fieldErrors.phone && (
                      <p
                        id="err-phone"
                        className="text-[10px] text-red-700 font-bold mt-1"
                      >
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="checkout-pincode"
                        className="block text-[11px] text-black/80 uppercase font-bold"
                      >
                        6-Digit PIN Code *
                      </label>
                      {pincodeLoading && (
                        <span className="text-[10px] text-amber-800 flex items-center gap-1 font-bold">
                          <Loader2 className="w-3 h-3 animate-spin" />{" "}
                          Detecting...
                        </span>
                      )}
                    </div>
                    <input
                      id="checkout-pincode"
                      type="text"
                      name="pincode"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      autoComplete="postal-code"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      required
                      value={customer.pincode}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      aria-describedby={
                        fieldErrors.pincode ? "err-pincode" : undefined
                      }
                      placeholder="683101"
                      className="w-full bg-white border border-black/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black font-bold"
                    />
                    {fieldErrors.pincode && (
                      <p
                        id="err-pincode"
                        className="text-[10px] text-red-700 font-bold mt-1"
                      >
                        {fieldErrors.pincode}
                      </p>
                    )}
                    {resolvedDeliveryInfo && (
                      <p className="text-[10px] text-emerald-800 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        <span>{resolvedDeliveryInfo}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="block text-[11px] text-black/80 uppercase mb-1 font-bold"
                    >
                      Email (For GST Tax Invoice)
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      value={customer.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-black/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="checkout-address"
                      className="block text-[11px] text-black/80 uppercase mb-1 font-bold"
                    >
                      Full Delivery Address ({customer.city}, {customer.state}) *
                    </label>
                    <textarea
                      id="checkout-address"
                      name="addressLine1"
                      rows={2}
                      autoComplete="street-address"
                      required
                      value={customer.addressLine1}
                      onChange={handleInputChange}
                      onBlur={handleFieldBlur}
                      aria-describedby={
                        fieldErrors.addressLine1 ? "err-address" : undefined
                      }
                      placeholder="House/Villa No., Street, Beach Resort or Landmark"
                      className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                    {fieldErrors.addressLine1 && (
                      <p
                        id="err-address"
                        className="text-[10px] text-red-700 font-bold mt-1"
                      >
                        {fieldErrors.addressLine1}
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Razorpay Gateway Notice (No Manual Method Selection / No COD) */}
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/5 border border-emerald-900/15 flex items-center justify-between text-[11px] text-black/75">
                <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Lock className="w-3.5 h-3.5" />
                  Paid Online via Razorpay Gateway
                </span>
                <span className="text-[10px] text-black/60">
                  UPI • Cards • NetBanking (Prepaid Only)
                </span>
              </div>

              {/* ONE-CLICK RAZORPAY PAYMENT SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isProcessing}
                enterKeyHint="done"
                className="w-full py-4 bg-[#141414] hover:bg-black text-[#faf8f5] font-mono text-xs sm:text-sm uppercase tracking-widest font-black rounded-full shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  PAY VIA RAZORPAY — ₹{total.toLocaleString("en-IN")}
                </span>
              </button>
            </form>
          )}

          {/* PROCESSING OVERLAY */}
          {step === "processing" && (
            <div className="py-16 flex flex-col items-center justify-center text-center font-mono space-y-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-black/10 border-t-black animate-spin" />
                <Lock className="w-6 h-6 absolute inset-0 m-auto text-black" />
              </div>
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider mb-2">
                  AUTHORIZING RAZORPAY PAYMENT
                </h3>
                <p className="text-xs text-black/60 max-w-sm">
                  {processingStatus}
                </p>
              </div>
            </div>
          )}

          {/* ORDER SUCCESS */}
          {step === "success" && confirmedOrder && (
            <div className="py-3 space-y-5 font-mono">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-[11px] uppercase tracking-widest text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-full">
                  Razorpay Payment Verified!
                </span>
                <h3 className="text-xl font-bold uppercase tracking-wider text-black mt-2">
                  ORDER #{confirmedOrder.orderId}
                </h3>
                <p className="text-xs text-black/70 max-w-md mx-auto mt-1">
                  Thank you,{" "}
                  <strong className="text-black">
                    {confirmedOrder.customer.fullName}
                  </strong>
                  ! Your handcrafted beachwear set is being prepared at our
                  Aluva, Kerala Atelier for express dispatch.
                </p>
              </div>

              <div className="p-4 bg-white/90 rounded-2xl border border-black/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-black">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>Order Confirmation &amp; GST Tax Receipt Sent</span>
                </div>
                <p className="text-[11px] text-black/70">
                  Sent to{" "}
                  <strong className="text-black">
                    {confirmedOrder.customer.email}
                  </strong>{" "}
                  and WhatsApp alert queued for{" "}
                  <strong className="text-black">
                    {confirmedOrder.customer.phone}
                  </strong>
                  .
                </p>
                <button
                  type="button"
                  onClick={onOpenNotificationCenter}
                  className="text-[11px] font-bold text-black underline underline-offset-4 hover:text-amber-900 flex items-center gap-1 pt-1"
                >
                  <span>View Email Receipt in Notification Center</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-black/10 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <span className="text-black/60">Order ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">
                      {confirmedOrder.orderId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      className="text-black/60 hover:text-black"
                      title="Copy Order ID"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pb-2 border-b border-black/10">
                  <span className="text-black/60">Total Paid (Razorpay):</span>
                  <span className="font-bold text-black">
                    ₹{confirmedOrder.pricing.total.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-black/60">Estimated Delivery:</span>
                  <span className="font-semibold text-black">
                    {confirmedOrder.shipping?.estimatedDelivery} (Blue Dart Air)
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Truck className="w-4 h-4 text-amber-800" />
                    <span>Instant Courier Dispatch Alert</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulateShippingDispatch}
                    disabled={isDispatchingNotification}
                    className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-full hover:bg-black/80 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {isDispatchingNotification ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Send Tracking Email</span>
                  </button>
                </div>
                {dispatchStatus && (
                  <p className="text-[10px] font-bold text-emerald-800">
                    {dispatchStatus}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {onOpenInvoice && confirmedOrder && (
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(confirmedOrder)}
                    className="flex-1 py-3 bg-neutral-50 hover:bg-neutral-100 text-black font-bold uppercase tracking-wider text-xs rounded-full border border-black/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span>Print Invoice</span>
                  </button>
                )}
                {onOpenTracking && confirmedOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTracking(confirmedOrder.orderId);
                    }}
                    className="flex-1 py-3 bg-neutral-50 hover:bg-neutral-100 text-black font-bold uppercase tracking-wider text-xs rounded-full border border-black/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-900" />
                    <span>Track Package</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-black hover:bg-black/80 text-white font-bold uppercase tracking-wider text-xs rounded-full transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {step === "failed" && (
            <div className="py-8 flex flex-col items-center justify-center text-center font-mono space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-red-900 mb-1">
                  COULD NOT COMPLETE ORDER
                </h3>
                <p className="text-xs text-black/70 max-w-sm mx-auto">
                  {errorMessage || "Please check your details and try again."}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("express")}
                  className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest rounded-full hover:bg-black/80 font-bold transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
