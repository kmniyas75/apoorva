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
  shippingFee: number;
  total: number;
  currency: string;
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
  };
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

