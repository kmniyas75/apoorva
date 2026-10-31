"use client";

import React, { useRef } from "react";
import { X, Printer, Download, ShieldCheck, CheckCircle2, QrCode } from "lucide-react";
import { OrderRecord } from "@/lib/types/checkout";

interface PrintableInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderRecord | null;
}

export default function PrintableInvoiceModal({
  isOpen,
  onClose,
  order
}: PrintableInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const { customer, items, pricing, orderId, payment, shipping } = order;

  // Indian GST computation (5% for artisanal apparel under ₹1000, 12% for ₹1000+)
  const gstRate = 0.12;
  const isInterState = customer.state?.toLowerCase() !== "kerala";
  const taxableAmount = Math.round(pricing.total / (1 + gstRate));
  const totalGst = pricing.total - taxableAmount;
  const cgst = isInterState ? 0 : Math.round(totalGst / 2);
  const sgst = isInterState ? 0 : totalGst - cgst;
  const igst = isInterState ? totalGst : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl max-h-[94vh] bg-white text-[#141414] rounded-3xl shadow-2xl border border-black/15 flex flex-col overflow-hidden">

        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-black/10 flex items-center justify-between no-print">
          <div className="flex items-center gap-3 font-mono">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              INV
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-black">
                TAX INVOICE & COURIER DISPATCH LABEL
              </h3>
              <p className="text-[10px] text-black/60">
                GSTIN: 32AAACA0192M1ZX • Order #{orderId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-black text-white text-xs font-mono uppercase font-bold tracking-wider rounded-full hover:bg-black/80 flex items-center gap-1.5 transition-all shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 sm:p-10 font-mono text-xs space-y-10 bg-white">

          {/* =========================================================================
              PART 1: 4x6" THERMAL COURIER SHIPPING LABEL (AWB BARCODE)
             ========================================================================= */}
          <div className="border-2 border-dashed border-black/30 p-6 rounded-2xl bg-neutral-50 max-w-2xl mx-auto shadow-sm">
            <div className="flex items-start justify-between border-b-2 border-black pb-3">
              <div>
                <div className="font-black text-lg tracking-wider">BLUE DART EXPRESS</div>
                <div className="text-[10px] text-black/70 uppercase">AIR CARGO PRIORITY FRAGILE</div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-black text-white font-bold text-xs uppercase tracking-widest rounded">
                  PREPAID
                </span>
                <div className="text-[10px] mt-1 font-bold">AIR ROUTE: COK &rarr; BOM</div>
              </div>
            </div>

            {/* AWB Barcode Simulation */}
            <div className="py-4 text-center border-b border-black/20">
              <div className="inline-flex items-center justify-center gap-1 tracking-widest text-3xl font-mono select-none overflow-hidden my-1">
                {"|| | |||| | ||||| ||| || |||| || ||| ||||| | || ||||| | ||"}
              </div>
              <div className="text-sm font-black tracking-widest uppercase">
                AWB NO: {shipping?.trackingNumber || "BD-88492019IN"}
              </div>
              <div className="text-[10px] text-black/60">ORDER REF: #{orderId}</div>
            </div>

            {/* From & To Addresses */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-black/20 text-[11px]">
              <div>
                <span className="font-bold uppercase text-[9px] text-black/50 block mb-1">
                  SHIP TO (RECIPIENT):
                </span>
                <div className="font-bold text-black text-sm">{customer.fullName}</div>
                <div className="text-black/80 leading-relaxed mt-0.5">
                  {customer.addressLine1}
                  {customer.addressLine2 ? `, ${customer.addressLine2}` : ""}<br />
                  <strong>{customer.city}, {customer.state} — PIN {customer.pincode}</strong><br />
                  Contact: {customer.phone}
                </div>
              </div>

              <div>
                <span className="font-bold uppercase text-[9px] text-black/50 block mb-1">
                  RETURN IF UNDELIVERED TO (SENDER):
                </span>
                <div className="font-bold text-black">APOORVA ATELIER STUDIO</div>
                <div className="text-black/80 leading-relaxed mt-0.5">
                  Periyar River Road, Aluva<br />
                  Ernakulam, Kerala — PIN 683101<br />
                  Helpline: +91 98470 89421
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-[10px] text-black/70">
              <div>Weight: <strong>0.65 KG</strong> • Items: <strong>{items.length} PC (Coastal Beachwear)</strong></div>
              <div className="font-bold text-black uppercase">TAMPER-PROOF WAX SEAL ATTACHED</div>
            </div>
          </div>

          {/* =========================================================================
              PART 2: FORMAL INDIAN GST TAX INVOICE
             ========================================================================= */}
          <div className="max-w-2xl mx-auto border border-black/20 p-8 rounded-2xl bg-white space-y-6 shadow-sm">
            {/* Invoice Letterhead */}
            <div className="flex items-start justify-between border-b border-black/15 pb-6">
              <div>
                <h2 className="font-serif text-2xl font-black tracking-widest uppercase text-black">
                  APOORVA
                </h2>
                <div className="text-[10px] tracking-widest text-black/60 uppercase mt-0.5">
                  Handcrafted Coastal Beachwear Atelier
                </div>
                <div className="text-[11px] text-black/70 mt-2 leading-tight">
                  Periyar River Road, Aluva, Ernakulam, Kerala - 683101<br />
                  <strong>GSTIN:</strong> 32AAACA0192M1ZX • <strong>State Code:</strong> 32 (Kerala)
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-neutral-50 font-bold text-xs uppercase tracking-wider rounded">
                  TAX INVOICE
                </span>
                <div className="text-xs font-bold text-black mt-2">
                  INV-APV-2026-{orderId.replace(/[^0-9]/g, "")}
                </div>
                <div className="text-[11px] text-black/60">
                  Date: {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Billed To / Shipped To Details */}
            <div className="grid grid-cols-2 gap-6 bg-neutral-50 p-4 rounded-xl text-[11px]">
              <div>
                <div className="font-bold uppercase text-[10px] text-black/50 mb-1">BILLED & SHIPPED TO:</div>
                <div className="font-bold text-sm text-black">{customer.fullName}</div>
                <div className="text-black/80 mt-1 leading-relaxed">
                  {customer.addressLine1}{customer.addressLine2 ? `, ${customer.addressLine2}` : ""}<br />
                  {customer.city}, {customer.state} — {customer.pincode}<br />
                  Email: {customer.email} • Tel: {customer.phone}
                </div>
              </div>

              <div>
                <div className="font-bold uppercase text-[10px] text-black/50 mb-1">ORDER & PAYMENT METRICS:</div>
                <div className="space-y-1 text-black/80">
                  <div>Order ID: <strong className="text-black">{orderId}</strong></div>
                  <div>Payment Mode: <strong className="text-black">Prepaid ({payment.method?.toUpperCase() || "ONLINE"})</strong></div>
                  <div>Razorpay Txn: <strong className="text-black">{payment.razorpayPaymentId || "Verified"}</strong></div>
                  <div>Place of Supply: <strong className="text-black">{customer.state || "India"}</strong></div>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-black font-bold uppercase text-black">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">HSN</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Taxable</th>
                  <th className="py-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-black/10">
                    <td className="py-3">
                      <div className="font-bold text-black">{item.name}</div>
                      <div className="text-[10px] text-black/60">Size: {item.size} • Hand-carved Aluva Atelier Shell</div>
                    </td>
                    <td className="py-3 text-black/70">6212</td>
                    <td className="py-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 text-right">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right">₹{Math.round(item.totalPrice / 1.12).toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-bold">₹{item.totalPrice.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations & GST Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-black/80">
                <div className="flex justify-between">
                  <span>Net Taxable Amount:</span>
                  <span>₹{taxableAmount.toLocaleString("en-IN")}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-black/70">
                    <span>IGST (12%):</span>
                    <span>₹{igst.toLocaleString("en-IN")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-black/70">
                      <span>CGST (6%):</span>
                      <span>₹{cgst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-black/70">
                      <span>SGST (6%):</span>
                      <span>₹{sgst.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>VIP Privilege ({pricing.discountPercentage}%):</span>
                    <span>-₹{pricing.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Air Express Shipping:</span>
                  <span>{pricing.shippingFee === 0 ? "FREE" : `₹${pricing.shippingFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-black pt-2 border-t-2 border-black">
                  <span>Grand Total:</span>
                  <span>₹{pricing.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Declaration & Signature */}
            <div className="pt-6 border-t border-black/15 flex items-center justify-between text-[10px] text-black/60">
              <div className="max-w-xs leading-relaxed">
                <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
              <div className="text-center">
                <div className="w-24 h-10 mx-auto border-b border-black flex items-center justify-center font-serif italic text-black/40 text-xs">
                  Apoorva Atelier
                </div>
                <div className="text-[9px] uppercase font-bold text-black mt-1">Authorized Signatory</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
