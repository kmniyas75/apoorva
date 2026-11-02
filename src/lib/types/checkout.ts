export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  orderNotes?: string;
}

export interface OrderItemSummary {
  id: string;
  productId: string;
  name: string;
  subName?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
  color?: string;
}

export interface OrderPricing {
  rawSubtotal: number;
  discountPercentage: number;
  discountAmount: number;
  subtotal: number;
  gstPercentage?: number;
  taxableAmount?: number;
  gstAmount?: number;
  shippingFee: number;
  total: number;
  currency: string;
}

export interface OrderRefundInfo {
  status: "none" | "initiated" | "processed" | "failed";
  refundId?: string;
  amount: number;
  reason?: string;
  speed?: "normal" | "optimum";
  refundedAt?: string;
  notes?: string;
}

export interface OrderDisputeInfo {
  status:
    | "none"
    | "open"
    | "under_review"
    | "resolved_refunded"
    | "resolved_replacement"
    | "rejected";
  type:
    | "delivery_delay"
    | "damaged_item"
    | "size_exchange"
    | "payment_dispute"
    | "cancellation_request"
    | "other";
  reason: string;
  customerNotes?: string;
  adminResolutionNotes?: string;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface OrderRecord {
  orderId: string;
  receiptNumber: string;
  createdAt: string;
  status:
    | "paid"
    | "processing"
    | "handcrafted"
    | "dispatched"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "failed";
  source?: "website" | "whatsapp" | "instagram" | "concierge";
  socialHandle?: string;
  customer: CustomerDetails;
  items: OrderItemSummary[];
  pricing: OrderPricing;
  payment: {
    gateway: "razorpay";
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    method?: string; // "upi" | "card" | "netbanking"
    isSandbox?: boolean;
    paidAt?: string;
  };
  shipping?: {
    courierName: string;
    trackingNumber: string;
    trackingUrl: string;
    estimatedDelivery: string;
    dispatchedAt?: string;
    shiprocketOrderId?: number;
    shipmentId?: number;
    shiprocketStatus?:
      | "ORDER_CREATED"
      | "AWB_ASSIGNED"
      | "PICKUP_SCHEDULED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "CANCELLED"
      | "SIMULATED";
    cancelledAt?: string;
    cancellationReason?: string;
  };
  refund?: OrderRefundInfo;
  dispute?: OrderDisputeInfo;
  stockRestored?: boolean;
}

export interface EmailNotificationLog {
  id: string;
  type: "order_confirmation" | "admin_alert" | "shipping_dispatch" | "payment_failed";
  recipient: string;
  subject: string;
  sentAt: string;
  status: "delivered" | "simulated" | "failed";
  htmlContent: string;
  orderId: string;
  resendMessageId?: string;
}

export interface TrackingMilestone {
  stage: "order_placed" | "handcrafted" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered";
  title: string;
  description: string;
  location: string;
  timestamp: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface ShipmentTrackingRecord {
  orderId: string;
  trackingNumber: string;
  courierName: string;
  courierLogo?: string;
  currentStatus: "order_placed" | "handcrafted" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered";
  statusBadge: string;
  origin: {
    atelier: string;
    city: string;
    state: string;
  };
  destination: {
    recipientName: string;
    city: string;
    state: string;
    pincode: string;
  };
  estimatedDelivery: string;
  serviceType: string;
  packageWeight: string;
  milestones: TrackingMilestone[];
  lastScanTimestamp: string;
  trackingUrl: string;
}

