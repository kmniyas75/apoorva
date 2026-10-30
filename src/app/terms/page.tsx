import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      subtitle="Terms of use, prepaid Razorpay transactions, and legal conditions for APOORVA™."
      activePath="/terms"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Overview &amp; Acceptance of Terms
        </h2>
        <p>
          This website is operated by <strong>APOORVA Coastal Atelier</strong>,
          headquartered at Periyar River Road, Aluva, Ernakulam, Kerala —
          683101, India. By accessing our website or purchasing our handcrafted
          beachwear products, you agree to be bound by these Terms &amp;
          Conditions.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. 100% Prepaid Online Orders via Razorpay
        </h2>
        <p>
          All orders placed on APOORVA™ are <strong>100% prepaid</strong> and
          processed securely through the <strong>Razorpay Payment Gateway</strong>{" "}
          (supporting UPI, Credit/Debit Cards, NetBanking, and Wallets). We do
          not offer Cash on Delivery (COD). Prices are listed in Indian Rupees
          (₹ INR) and are inclusive of applicable Indian GST.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Natural Material Variations
        </h2>
        <p>
          Because our garments are handcrafted from natural Kerala coconut
          shells, combed tender coir fiber, and handloom jute, subtle variations
          in shell grain, natural color tone, and weave texture are inherent
          hallmarks of authenticity and not manufacturing defects.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          4. Intellectual Property
        </h2>
        <p>
          All brand trademarks, the APOORVA™ crest and wordmark, 360° product
          visuals, motion videos, and garment designs are the exclusive
          intellectual property of APOORVA Coastal Atelier, Aluva, Kerala.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          5. Governing Law &amp; Jurisdiction
        </h2>
        <p>
          These Terms &amp; Conditions are governed by the laws of India. Any
          disputes arising out of or relating to transactions on this website
          shall be subject to the exclusive jurisdiction of the courts in{" "}
          <strong>Aluva / Ernakulam, Kerala, India</strong>.
        </p>
      </section>
    </LegalPageShell>
  );
}

