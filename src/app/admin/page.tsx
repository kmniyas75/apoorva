"use client";

import React, { useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import PrintableInvoiceModal from "@/components/PrintableInvoiceModal";
import { OrderRecord } from "@/lib/types/checkout";

export default function AdminPage() {
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRecord | null>(null);

  return (
    <>
      <AdminPanel
        isOpen={true}
        isFullPage={true}
        onPrintInvoice={(order) => setInvoiceOrder(order)}
      />

      <PrintableInvoiceModal
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
      />
    </>
  );
}

