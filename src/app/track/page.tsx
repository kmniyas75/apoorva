"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Plane,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowLeft,
  Bell,
  Check
} from "lucide-react";
import { ShipmentTrackingRecord } from "@/lib/types/checkout";

function TrackContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("orderId") || searchParams.get("awb") || searchParams.get("query") || "APV-89421";

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
    fetchTracking(initialQuery);
  }, [initialQuery]);

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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 font-mono">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-black/70 hover:text-black font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to APOORVA Atelier</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-100/70 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Blue Dart Air Cargo Integration</span>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-neutral-50 p-6 sm:p-8 rounded-3xl border border-black/10 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-amber-900 font-bold">
              LOGISTICS & DISPATCH PORTAL
            </span>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-black mt-1">
              ARCHIVE SHIPMENT TRACKING
            </h1>
            <p className="text-xs text-black/60 mt-1">
              Real-time telemetry for hand-inspected coastal beachwear en route from Aluva, Kerala.
            </p>
          </div>

          <button
            onClick={() => fetchTracking(query)}
            disabled={isLoading}
            className="self-start sm:self-auto px-4 py-2 bg-white rounded-full border border-black/10 text-xs font-bold uppercase tracking-wider hover:border-black flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Scan</span>
          </button>
        </div>

        {/* Search input inside card */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Order ID (#APV-...) or Waybill Tracking AWB"
              className="w-full bg-white border border-black/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs uppercase focus:outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-black text-white text-xs uppercase font-bold tracking-widest rounded-2xl hover:bg-black/80 transition-all disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Track Shipment"}
          </button>
        </form>

        {/* Quick waybills */}
        <div className="flex items-center gap-2 mt-3 text-[11px] text-black/60">
          <span>Sample Waybills:</span>
          {["APV-89421", "APV-31298", "BD-88492019IN"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                fetchTracking(s);
              }}
              className="underline font-semibold hover:text-black uppercase"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-900 rounded-2xl text-xs mb-6">
          {error}
        </div>
      )}

      {trackingData && (
        <div className="space-y-6">
          {/* Main Route Card */}
          <div className="bg-white/80 p-6 sm:p-8 rounded-3xl border border-black/10 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  {trackingData.statusBadge}
                </span>
                <div className="text-xs text-black/60 mt-2">
                  Carrier: <strong className="text-black">{trackingData.courierName}</strong> • AWB: <strong className="text-black">{trackingData.trackingNumber}</strong>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-[11px] text-black/50 uppercase tracking-wider">Estimated Delivery</div>
                <div className="text-base font-bold text-black flex items-center gap-1.5 sm:justify-end mt-0.5">
                  <Clock className="w-4 h-4 text-amber-800" />
                  <span>{trackingData.estimatedDelivery}</span>
                </div>
              </div>
            </div>

            {/* Flight / Transit Route Graphics */}
            <div className="grid grid-cols-3 items-center py-4 text-center">
              <div className="text-left">
                <div className="text-[10px] text-black/50 uppercase tracking-widest flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-900" /> Studio Origin
                </div>
                <div className="font-bold text-sm text-black mt-1">
                  {trackingData.origin.city}, {trackingData.origin.state}
                </div>
                <div className="text-[11px] text-black/60">{trackingData.origin.atelier}</div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-3 text-black/40">
                  <div className="w-12 sm:w-24 h-0.5 bg-black/20" />
                  <Plane className="w-5 h-5 text-black animate-pulse" />
                  <div className="w-12 sm:w-24 h-0.5 bg-black/20" />
                </div>
                <span className="text-[10px] text-black/60 uppercase tracking-widest mt-1.5">
                  Air Cargo Express
                </span>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-black/50 uppercase tracking-widest flex items-center justify-end gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-800" /> Destination
                </div>
                <div className="font-bold text-sm text-black mt-1">
                  {trackingData.destination.city}, {trackingData.destination.state}
                </div>
                <div className="text-[11px] text-black/60">PIN: {trackingData.destination.pincode}</div>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="bg-white/80 p-6 sm:p-8 rounded-3xl border border-black/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Courier Activity & Scan Manifest
              </span>
              <span className="text-[11px] text-black/50">
                Last Scanned: Today, {trackingData.lastScanTimestamp}
              </span>
            </div>

            <div className="space-y-6 relative">
              {trackingData.milestones.map((m, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  {idx !== trackingData.milestones.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-7 w-0.5 h-full ${
                        m.isCompleted ? "bg-black" : "bg-black/15"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      m.isCurrent
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

                  <div className="flex-1 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-bold text-black flex items-center gap-2">
                        <span>{m.title}</span>
                        {m.isCurrent && (
                          <span className="text-[9px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded uppercase">
                            Current Scan
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-black/50 font-medium">
                        {m.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-black/70 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="text-[11px] text-black/50 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-black/40" />
                      <span>{m.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details & WhatsApp alerts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 p-5 rounded-2xl border border-black/10 space-y-2">
              <div className="font-bold uppercase text-xs text-black">Packaging Guarantee</div>
              <p className="text-[11px] text-black/70 leading-relaxed">
                Every APOORVA piece is inspected for shell wall thickness, oiled with organic coconut oil, and sealed inside an archival cedar gift box.
              </p>
              <div className="text-[11px] text-emerald-900 font-semibold pt-1">
                ✓ Intact Tamper-Evident Wax Stamp required on delivery
              </div>
            </div>

            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Bell className="w-4 h-4 text-amber-800" />
                <span>WhatsApp Delivery Alerts</span>
              </div>
              <p className="text-[11px] text-amber-900/80">
                Receive instant message when rider is 15 minutes away from your delivery address.
              </p>
              <form onSubmit={handleSubscribeAlerts} className="flex gap-2 pt-1">
                <input
                  type="tel"
                  value={phoneForAlerts}
                  onChange={(e) => setPhoneForAlerts(e.target.value)}
                  placeholder="+91 Mobile Number"
                  className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-black text-white text-[11px] font-bold uppercase rounded-xl hover:bg-black/80"
                >
                  {subscribedAlerts ? <Check className="w-3.5 h-3.5" /> : <span>Notify</span>}
                </button>
              </form>
              {subscribedAlerts && (
                <span className="text-[10px] text-emerald-800 font-bold">
                  ✓ Delivery notifications enabled.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <main className="min-h-screen bg-white text-[#141414]">
      {/* Top Bar */}
      <header className="px-6 md:px-12 py-5 border-b border-black/10 flex items-center justify-between">
        <Link href="/" className="text-xl md:text-2xl font-black uppercase font-mono tracking-wider text-[#141414]">
          APOORVA™
        </Link>
        <span className="text-[11px] font-mono tracking-widest uppercase text-black/60">
          LOGISTICS DESK
        </span>
      </header>

      <Suspense fallback={
        <div className="p-12 text-center font-mono text-xs">
          Loading tracking telemetry...
        </div>
      }>
        <TrackContent />
      </Suspense>
    </main>
  );
}
