import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="How APOORVA™ collects, protects, and processes your personal and payment information."
      activePath="/privacy"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Information We Collect
        </h2>
        <p>
          When you purchase a beachwear set from APOORVA™ (via our website,
          WhatsApp Business bot, or Instagram DM checkout), we collect only the
          essential details required to fulfill and deliver your order:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Full Name and Delivery Street Address, City, State, and PIN Code</li>
          <li>Mobile / WhatsApp Number (for courier delivery OTP and tracking alerts)</li>
          <li>Email Address (for sending your GST Tax Invoice and AWB tracking receipt)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. Razorpay Payment Security (PCI-DSS Compliant)
        </h2>
        <p>
          We do <strong>not</strong> collect or store your credit card numbers,
          CVV, netbanking credentials, or UPI PINs on our servers. All online
          payments are handled directly by <strong>Razorpay</strong> using
          256-bit SSL encryption and PCI-DSS Level 1 security standards.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Sharing with Logistics Partners
        </h2>
        <p>
          Your name, delivery address, and phone number are shared strictly with
          our authorized air-express courier partners (Blue Dart Express,
          Delhivery, or Shiprocket) solely for the purpose of delivering your
          order from our Aluva, Kerala atelier to your doorstep.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          4. Meta (WhatsApp, Instagram &amp; Facebook) User Data Deletion Instructions
        </h2>
        <p>
          If you have interacted with APOORVA™ through Facebook Login, Instagram
          DM, or WhatsApp Business and wish to delete all personal data
          associated with your account or phone number:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Send an email with the subject <strong>&quot;DATA DELETION REQUEST&quot;</strong> to{" "}
            <strong>apoorvacoastal@gmail.com</strong> (or{" "}
            <strong>concierge@apoorva.luxury</strong>), or
          </li>
          <li>
            Send the message <strong>&quot;DELETE MY DATA&quot;</strong> to our
            official WhatsApp Business / Instagram handle.
          </li>
          <li>
            All associated profile, messaging, and order contact records will be
            permanently purged within 48 hours and a confirmation receipt will
            be issued.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          5. Data Protection &amp; Grievance Officer
        </h2>
        <p>
          To request access, correction, or deletion of your personal data,
          please contact our Privacy &amp; Grievance Officer at{" "}
          <strong>apoorvacoastal@gmail.com</strong> /{" "}
          <strong>concierge@apoorva.luxury</strong> or write to APOORVA Coastal
          Atelier, Periyar River Road, Aluva, Ernakulam, Kerala — 683101.
        </p>
      </section>
    </LegalPageShell>
  );
}

