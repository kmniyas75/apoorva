import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function ContactPage() {
  return (
    <LegalPageShell
      title="Contact Us & Atelier Concierge"
      subtitle="Reach our Aluva, Kerala studio for sizing advice, custom resort orders, or shipment support."
      activePath="/contact"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Studio &amp; Registered Office Address
        </h2>
        <p>
          <strong>APOORVA Coastal Atelier</strong>
          <br />
          Periyar River Road, Aluva
          <br />
          Ernakulam District, Kerala — 683101, India
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. Direct Customer Support &amp; WhatsApp Concierge
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Concierge Email:</strong> concierge@apoorva.luxury
          </li>
          <li>
            <strong>Phone &amp; WhatsApp Support:</strong> +91 98470 89421
          </li>
          <li>
            <strong>Operating Hours:</strong> Monday to Saturday, 9:30 AM – 6:30
            PM IST
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Bulk Resort &amp; Boutique Inquiries
        </h2>
        <p>
          For luxury beach resorts, honeymoon villas, and coastal boutiques
          seeking curated APOORVA™ beachwear gift boxes, please write to{" "}
          <strong>concierge@apoorva.luxury</strong> with your resort location
          and quantity requirements.
        </p>
      </section>
    </LegalPageShell>
  );
}

