import React from "react";
import LegalPageShell from "@/components/LegalPageShell";

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About APOORVA™ Coastal Atelier"
      subtitle="Handcrafted Coconut Shell, Combed Coir Fringe & Fine Jute Beachwear from Aluva, Kerala."
      activePath="/about"
    >
      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          1. Our Heritage in Aluva, Kerala
        </h2>
        <p>
          Founded along the tranquil banks of the Periyar River in{" "}
          <strong>Aluva, Ernakulam, Kerala</strong>, <strong>APOORVA™</strong>{" "}
          is a contemporary coastal beachwear atelier dedicated to transforming
          Kerala&apos;s most iconic natural fibers—mature coconut shells,
          ultra-combed tender coir, and breathable fine-weave jute—into
          sculpted, skin-soft resort apparel.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          2. Signature Two-Piece Craftsmanship
        </h2>
        <p>
          Unlike novelty coconut garments, every APOORVA piece is engineered for
          real beach comfort, movement, and anatomical contouring:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Anatomical &ldquo;Cut a Cap&rdquo; Contour:</strong> We
            select mature Kerala coconuts and carve shallow oval caps from the
            flattest natural face (Style A) or deep sculpted cups (Style B) so
            they hug the body naturally.
          </li>
          <li>
            <strong>100% Breathable Cotton Interior Lining:</strong> Every
            polished shell cup and fine-weave jute wrap skirt is lined inside
            with soft organic cotton for zero irritation during beach walks,
            poolside lounging, or island dancing.
          </li>
          <li>
            <strong>Organic Virgin Coconut Oil Finish:</strong> Each shell and
            coconut waist buckle is hand-sanded through five grits and sealed
            with cold-pressed virgin coconut oil for water and salt resilience.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-black uppercase text-black">
          3. Sustainable &amp; Artisan-Direct
        </h2>
        <p>
          Every order is handcrafted, inspected, and packed in our archival
          presentation box at our studio in <strong>Aluva, Kerala (PIN 683101)</strong>,
          supporting local shell carvers, coir spinners, and handloom weavers
          across Ernakulam and coastal Kerala.
        </p>
      </section>
    </LegalPageShell>
  );
}

