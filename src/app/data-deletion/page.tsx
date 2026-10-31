import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function DataDeletionPage() {
  return (
    <LegalPageShell
      title="User Data Deletion Instructions"
      subtitle="Official Meta (Facebook, Instagram & WhatsApp) user data deletion procedure for APOORVA™ (App ID: 1063008853460924)."
      activePath="/privacy"
    >
      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. How to Request Immediate Data Deletion
        </h2>
        <p>
          In accordance with Meta Platform Terms and GDPR / DPDP data protection
          regulations, users who have interacted with <strong>APOORVA™</strong>{" "}
          via Facebook Login, Instagram Direct Messages, or WhatsApp Business
          can request complete removal of their personal data at any time:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong>Via Email:</strong> Send an email to{" "}
            <strong>apoorvacoastal@gmail.com</strong> with the subject line{" "}
            <code>DATA DELETION REQUEST</code> and include your registered phone
            number, Instagram handle, or email address.
          </li>
          <li>
            <strong>Via WhatsApp / Instagram DM:</strong> Reply{" "}
            <code>DELETE MY DATA</code> in our official WhatsApp Business or
            Instagram DM thread.
          </li>
          <li>
            <strong>Via Facebook Settings:</strong> Go to your Facebook Account{" "}
            <em>Settings &amp; Privacy → Settings → Apps and Websites</em>,
            locate <strong>Apoorva</strong>, and click <strong>Remove</strong>.
          </li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. What Data Is Deleted &amp; Timeline
        </h2>
        <p>
          Upon receiving your request, we permanently purge your social profile
          identifier, chat transcripts, phone number, and saved shipping details
          from our database within <strong>48 hours</strong> and issue a unique
          confirmation code.
        </p>
      </section>
    </LegalPageShell>
  );
}
