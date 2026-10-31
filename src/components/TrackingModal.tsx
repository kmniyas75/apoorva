"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Truck,
  Plane,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Bell,
  ArrowRight,
  Check,
  Printer
} from "lucide-react";
import { ShipmentTrackingRecord } from "@/lib/types/checkout";

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onOpenInvoice?: (orderId: string) => void;
}

export default function TrackingModal({
  isOpen,
  onClose,
  initialQuery = "APV-89421",
  onOpenInvoice
}: TrackingModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [trackingData, setTrackingData] = useState<ShipmentTrackingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneForAlerts, setPhoneForAlerts] = useState("");
  const [subscribedAlerts, setSubscribedAlerts] = useState(false);

  const fetchTracking = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shipping/track?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("Unable to locate shipment details.");
      }
      const data = await res.json();
      setTrackingData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracking lookup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || "APV-89421";
      setQuery(q);
      fetchTracking(q);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchTracking(query.trim());
    }
  };

  const handleSubscribeAlerts = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneForAlerts.trim()) {
      setSubscribedAlerts(true);
      setTimeout(() => setSubscribedAlerts(false), 4000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white text-[#141414] rounded-3xl shadow-2xl border border-black/15 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-[#faf8f5] flex items-center justify-center font-mono">
              <Truck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 id="tracking-modal-title" className="font-mono font-bold text-sm uppercase tracking-wider text-black">
                LIVE COURIER & TRANSIT TRACKING
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-black/60">
                <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Blue Dart Air Cargo & Delhivery API
                </span>
                <span>•</span>
                <span>Aluva Studio Dispatch</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTracking(query)}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
              title="Refresh Tracking Scans"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
              title="Close tracking"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Presets */}
        <div className="px-6 py-3 bg-neutral-100 border-b border-black/10 font-mono text-xs">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-black/40 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Order ID (e.g. APV-89421) or AWB Tracking No."
                className="w-full bg-white border border-black/15 rounded-xl pl-9 pr-3 py-2 text-xs uppercase font-mono focus:outline-none focus:border-black"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-black text-white rounded-xl text-xs uppercase font-bold tracking-wider hover:bg-black/80 transition-all disabled:opacity-50"
            >
              {isLoading ? "Tracking..." : "Track"}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-black/60">
            <span>Sample Waybills:</span>
            {["APV-89421", "APV-31298", "BD-88492019IN"].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  fetchTracking(sample);
                }}
                className="underline hover:text-black font-semibold uppercase"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono">
          {error && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-900 rounded-2xl text-xs">
              {error}
            </div>
          )}

          {trackingData && (
            <>
              {/* Route & Delivery Status Card */}
              <div className="p-5 bg-white/90 rounded-2xl border border-black/10 shadow-sm space-y-4">
                {/* Status Badge & ETA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      {trackingData.statusBadge}
                    </span>
                    <div className="text-xs text-black/60 mt-1">
                      Courier: <strong className="text-black">{trackingData.courierName}</strong> • AWB: <strong className="text-black">{trackingData.trackingNumber}</strong>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[10px] text-black/50 uppercase tracking-wider">Estimated Delivery</div>
                    <div className="text-sm font-bold text-black flex items-center gap-1 sm:justify-end">
                      <Clock className="w-3.5 h-3.5 text-amber-800" />
                      <span>{trackingData.estimatedDelivery}</span>
                    </div>
                  </div>
                </div>

                {/* Origin to Destination Route Visualizer */}
                <div className="grid grid-cols-3 items-center text-center py-2">
                  <div className="text-left">
                    <div className="text-[10px] text-black/50 uppercase tracking-widest flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-900" /> Origin Atelier
                    </div>
                    <div className="font-bold text-xs text-black mt-0.5">
                      {trackingData.origin.city}, {trackingData.origin.state}
                    </div>
                    <div className="text-[10px] text-black/60">{trackingData.origin.atelier}</div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-black/40">
                      <div className="w-8 sm:w-16 h-0.5 bg-black/20" />
                      <Plane className="w-4 h-4 text-black animate-pulse" />
                      <div className="w-8 sm:w-16 h-0.5 bg-black/20" />
                    </div>
                    <span className="text-[9px] text-black/50 uppercase tracking-widest mt-1">Air Express Cargo</span>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-black/50 uppercase tracking-widest flex items-center justify-end gap-1">
                      <MapPin className="w-3 h-3 text-emerald-800" /> Destination
                    </div>
                    <div className="font-bold text-xs text-black mt-0.5">
                      {trackingData.destination.city}, {trackingData.destination.state}
                    </div>
                    <div className="text-[10px] text-black/60">PIN: {trackingData.destination.pincode}</div>
                  </div>
                </div>
              </div>

              {/* Milestones Stepper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black">
                  <span>Transit Timeline & Scans</span>
                  <span className="text-[10px] text-black/50 font-normal">Last Scanned: Today, {trackingData.lastScanTimestamp}</span>
                </div>

                <div className="p-5 bg-white/70 rounded-2xl border border-black/10 space-y-6 relative">
                  {trackingData.milestones.map((m, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Connecting Line */}
                      {idx !== trackingData.milestones.length - 1 && (
                        <div
                          className={`absolute left-[15px] top-6 w-0.5 h-full ${m.isCompleted ? "bg-black" : "bg-black/15"
                            }`}
                        />
                      )}

                      {/* Checkpoint Icon */}
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${m.isCurrent
                          ? "bg-black text-white ring-4 ring-amber-400/30 shadow-md"
                          : m.isCompleted
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-black/40 border border-black/15"
                          }`}
                      >
                        {m.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-[11px] font-bold">{idx + 1}</span>
                        )}
                      </div>

                      {/* Milestone Content */}
                      <div className="flex-1 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-bold text-black flex items-center gap-1.5">
                            <span>{m.title}</span>
                            {m.isCurrent && (
                              <span className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded uppercase">
                                Current Location
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-black/50 sm:text-right font-medium">
                            {m.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-black/70 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                        <div className="text-[10px] text-black/50 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-black/40" />
                          <span>{m.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Details & Official Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-black/10 space-y-1.5">
                  <div className="font-bold uppercase text-[11px] text-black mb-1">
                    Package Specifications
                  </div>
                  <div className="flex justify-between text-black/70 text-[11px]">
                    <span>Packaging:</span>
                    <span className="font-bold text-black">{trackingData.packageWeight}</span>
                  </div>
                  <div className="flex justify-between text-black/70 text-[11px]">
                    <span>Service Level:</span>
                    <span className="font-bold text-black">{trackingData.serviceType}</span>
                  </div>
                  <div className="flex justify-between text-black/70 text-[11px]">
                    <span>Security Seal:</span>
                    <span className="font-bold text-emerald-800">APOORVA Wax Seal #9921</span>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-black/10 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold uppercase text-[11px] text-black mb-1">
                      Direct Courier Portal
                    </div>
                    <p className="text-[11px] text-black/60 leading-tight">
                      Inspect official scans and airway bill manifests directly on the carrier portal.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={trackingData.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-black text-white text-[11px] font-bold uppercase rounded-xl hover:bg-black/80 transition-colors"
                    >
                      <span>Carrier Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {onOpenInvoice && (
                      <button
                        onClick={() => onOpenInvoice(trackingData.orderId)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-black/15 text-black text-[11px] font-bold uppercase rounded-xl hover:border-black transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>GST Invoice</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SMS / WhatsApp Updates Box */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Bell className="w-4 h-4 text-amber-800" />
                  <span>Receive WhatsApp & SMS Delivery Alerts</span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  Get real-time notifications when the delivery partner departs for your doorstep with your secret delivery PIN.
                </p>
                <form onSubmit={handleSubscribeAlerts} className="flex gap-2 pt-1">
                  <input
                    type="tel"
                    value={phoneForAlerts}
                    onChange={(e) => setPhoneForAlerts(e.target.value)}
                    placeholder="+91 Mobile number"
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-black text-white text-[11px] font-bold uppercase rounded-xl hover:bg-black/80 transition-all flex items-center gap-1"
                  >
                    {subscribedAlerts ? <Check className="w-3.5 h-3.5" /> : <span>Notify Me</span>}
                  </button>
                </form>
                {subscribedAlerts && (
                  <div className="text-[10px] font-bold text-emerald-800">
                    ✓ SMS & WhatsApp delivery notifications active for this AWB.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-black/60">
          <span>APOORVA Atelier Aluva Logistics Desk</span>
          <button
            onClick={onClose}
            className="text-black font-bold uppercase hover:underline"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
