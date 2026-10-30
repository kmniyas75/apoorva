import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function RefundPage() {
  return (
    <LegalPageShell
      title="Refund, Return & Cancellation Policy"
      subtitle="Transparent cancellation, replacement, and Razorpay refund timelines for prepaid orders."
      activePath="/refund"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Order Cancellation Policy
        </h2>
        <p>
          You may cancel your prepaid order for a <strong>100% full refund</strong>{" "}
          anytime before the order is dispatched from our{" "}
          <strong>Aluva, Kerala Atelier</strong> (typically within 12 hours of
          booking). Simply email <strong>concierge@apoorva.luxury</strong> or
          message our WhatsApp Concierge at <strong>+91 98470 89421</strong>{" "}
          with your Order ID.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. Damaged in Transit or Size Exchange
        </h2>
        <p>
          Every coconut shell and coir/jute garment is sealed with a
          tamper-evident wax stamp prior to dispatch. If your package arrives
          with transit damage to the coconut shell or an incorrect cup/skirt
          size:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Notify us within <strong>48 hours of delivery</strong> with an
            unboxing photo or video.
          </li>
          <li>
            We will arrange a free reverse pickup and dispatch a brand-new
            replacement set from Aluva, Kerala at zero cost to you, or issue a
            full refund if preferred.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Hygiene Guidelines for Intimate Beachwear
        </h2>
        <p>
          For hygiene and safety reasons, worn, washed, or unsealed intimate
          beachwear sets with broken hygiene tags cannot be returned unless the
          item arrived damaged or defective.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          4. Razorpay Refund Processing Timeline
        </h2>
        <p>
          Approved refunds are initiated within <strong>24 hours</strong> via
          the <strong>Razorpay Payment Gateway</strong> directly back to your
          original payment method (UPI, Credit/Debit Card, or NetBanking
          account) and reflect in your bank statement within{" "}
          <strong>5–7 business days</strong>.
        </p>
      </section>
    </LegalPageShell>
  );
}

