import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function ShippingPage() {
  return (
    <LegalPageShell
      title="Shipping & Delivery Policy"
      subtitle="Express air cargo dispatch from our Aluva, Kerala Atelier across India."
      activePath="/shipping"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Dispatch Origin: Aluva, Ernakulam, Kerala
        </h2>
        <p>
          All orders are handcrafted, quality-inspected, and dispatched directly
          from our studio in <strong>Aluva, Ernakulam, Kerala (PIN 683101)</strong>,
          located 15 minutes from Cochin International Airport (COK) for rapid
          air cargo connections across India.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. Processing &amp; Transit Timelines
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Order Dispatch:</strong> Within 24 hours of Razorpay payment
            confirmation.
          </li>
          <li>
            <strong>Kerala &amp; South India (Kochi, Bengaluru, Chennai, Goa, Hyderabad):</strong>{" "}
            1–2 Business Days via Blue Dart / Delhivery Air Express.
          </li>
          <li>
            <strong>Rest of India (Mumbai, Delhi NCR, Kolkata, Pune):</strong>{" "}
            2–3 Business Days via Air Cargo Express.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Complimentary Express Shipping
        </h2>
        <p>
          We offer <strong>Free Express Shipping</strong> across India on all
          beachwear sets above ₹4,000. As soon as your package is handed over to
          the courier, you will receive an email and WhatsApp message with your
          live Airway Bill (AWB) tracking number.
        </p>
      </section>
    </LegalPageShell>
  );
}

