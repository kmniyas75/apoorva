export interface CupStyle {
  id: "style-a" | "style-b";
  name: string;
  cutType: string;
  diameter: string;
  depth: string;
  nutSelection: string;
  wallThickness: string;
  description: string;
}

export interface SkirtOption {
  id: "skirt-1" | "skirt-2";
  name: string;
  fabric: string;
  silhouette: string;
  length: string;
  origin: string;
  details: string;
}

export interface BeachMoment {
  id: string;
  title: string;
  subtitle: string;
  occasion: string;
  image: string;
  productId: string;
}

export interface Product {
  id: string;
  number: string;
  sku: string;
  name: string;
  shortName: string;
  subName: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string;
  modelImage: string;
  video: string;
  videoCaption: string;
  gallery: string[];
  color: string;
  fit: string;
  gsm: string;
  material: string;
  edition: string;
  description: string;
  features: string[];
  cupStyles: CupStyle[];
  skirtOptions: SkirtOption[];
  sizes: { size: string; stock: number }[];
  tags: string[];
}

export const CUP_STYLES: CupStyle[] = [
  {
    id: "style-a",
    name: "STYLE A: SHALLOW OVAL CAP",
    cutType: "Oval cap cut from the flattest side of the shell (not halved)",
    diameter: "12–14 cm length",
    depth: "2.5–3.5 cm shallow rise",
    nutSelection: "Large, round Kerala nuts harvested for flattest natural side",
    wallThickness: "3–5 mm lightweight beach profile",
    description:
      "Anatomically shallow curve that hugs the bust naturally without protruding like a half-sphere bowl."
  },
  {
    id: "style-b",
    name: "STYLE B: DEEP COVERAGE",
    cutType: "Full half-shell cut across the widest equatorial axis",
    diameter: "16–18 cm broad span",
    depth: "6–7 cm sculpted cup depth",
    nutSelection: "Largest mature nuts available (18 cm+ diameter)",
    wallThickness: "4–6 mm reinforced structural shell",
    description:
      "Sculpted full-coverage profile designed for larger bust sizes with elevated support for beach waves and dancing."
  }
];

export const SKIRT_OPTIONS: SkirtOption[] = [
  {
    id: "skirt-1",
    name: "SKIRT 01: KERALA COMBED COIR FRINGE",
    fabric: "Softest grade combed tender coir fiber (non-scratch, beach-ready)",
    silhouette: "Dense kinetic hula fringe on braided cotton waist rope",
    length: "Beach Midi (45 cm) or Resort Mini (35 cm)",
    origin: "Master coastal artisans at our Aluva, Kerala Atelier",
    details:
      "Ultra-combed tender husk coir fiber pre-tested for salt-water breeze, dancing movement, and zero itch."
  },
  {
    id: "skirt-2",
    name: "SKIRT 02: LINED FINE-WEAVE JUTE WRAP",
    fabric: "Soft fine-weave jute-cotton blend with 100% breathable cotton lining",
    silhouette: "A-line wrap mini with carved coconut ring buckle & 3 shell buttons",
    length: "38–40 cm A-line mini drape with fringe hem",
    origin: "Artisanal coastal handloom weave",
    details:
      "Overlapping front panel creating an effortless 15 cm beach walk slit with reinforced fringe edging."
  }
];

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const PRODUCTS: Product[] = [
  {
    id: "apoorva-01-coir-beach-set",
    number: "01",
    sku: "APV-BCH-01",
    name: "COCONUT & COIR FRINGE BEACH SET",
    shortName: "Coir Fringe Beach Set",
    subName: "PRODUCT 01 // TROPICAL HULA FRINGE BEACHWEAR",
    price: 4200,
    originalPrice: 5200,
    badge: "BESTSELLER // SUNSET & BONFIRE BEACHWEAR",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435605/apoorva/apoorva_model_editorial.png",
    modelImage: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435607/apoorva/beach_couple_sunset.jpg",
    video: "https://res.cloudinary.com/oiu0lhfe/video/upload/v1793435623/apoorva/coir_fringe_beach.mp4",
    videoCaption: "Live Beach Motion: Hand-braided waistband & kinetic Kerala coir fringe in ocean breeze",
    gallery: [
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435605/apoorva/apoorva_model_editorial.png",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435607/apoorva/beach_couple_sunset.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_pool_lounge.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_resort_gift.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435606/apoorva/beach_bonfire_party.jpg"
    ],
    color: "Sun-Kissed Golden Coir & Polished Coconut Shell",
    fit: "Free Size Adjustable Braided Halter & Waist Tie",
    gsm: "Hand-Carved Coconut Shell & Combed Kerala Coir Fringe",
    material: "100% Virgin Coconut Oil Polished Shell & Combed Tender Coir",
    edition: "Beachwear Capsule 01 — Aluva, Kerala",
    description:
      "Our iconic two-piece tropical beachwear set handcrafted at our Aluva, Kerala atelier for golden-hour shoreline walks, poolside lounging, honeymoon surprises, and midnight beach bonfire parties. Features a cotton-lined hand-carved coconut shell bra connected with a carved coconut ring and wooden beads, paired with a kinetic combed coir fringe beach skirt.",
    features: [
      "Hand-carved coconut bra with center coconut ring & wooden bead tassels",
      "Signature 'cut a cap, don’t split in half' contour for a flattering beach fit",
      "Soft cotton-padded interior shell lining for all-day beach & pool comfort",
      "Combed tender Kerala coir fringe skirt that sways with every step and dance",
      "Adjustable braided tie cords fit XS to XL effortlessly (Gift-ready!)"
    ],
    cupStyles: CUP_STYLES,
    skirtOptions: SKIRT_OPTIONS,
    sizes: [
      { size: "FREE SIZE (Adjustable Tie)", stock: 18 },
      { size: "S/M (Style A Cup)", stock: 12 },
      { size: "M/L (Style B Cup)", stock: 14 }
    ],
    tags: [
      "beachwear",
      "coir fringe skirt",
      "coconut shell bra",
      "hula beach set",
      "honeymoon gift",
      "bonfire party",
      "apoorva"
    ]
  },
  {
    id: "apoorva-02-jute-wrap-set",
    number: "02",
    sku: "APV-BCH-02",
    name: "COCONUT & JUTE WRAP BEACH SET",
    shortName: "Jute Wrap Beach Set",
    subName: "PRODUCT 02 // TAILORED A-LINE RESORT BEACHWEAR",
    price: 4500,
    originalPrice: 5500,
    badge: "RESORT EDITION // CABANA & POOL LOUNGE",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435598/apoorva/apoorva_coconut_set.png",
    modelImage: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_pool_lounge.jpg",
    video: "https://res.cloudinary.com/oiu0lhfe/video/upload/v1793435639/apoorva/jute_wrap_skirt.mp4",
    videoCaption: "Close-Up Craft Film: Carved coconut ring buckle, 3 shell buttons & soft cotton interior lining",
    gallery: [
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435598/apoorva/apoorva_coconut_set.png",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435606/apoorva/apoorva_skirt.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435597/apoorva/apoorva_bra.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_pool_lounge.jpg",
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435607/apoorva/beach_couple_sunset.jpg"
    ],
    color: "Natural Sand Jute & Satin-Polished Coconut Shell",
    fit: "Adjustable Wrap Waist with Coconut Buckle & Side Slit",
    gsm: "Hand-Carved Coconut Shell & Cotton-Lined Fine Jute Weave",
    material: "100% Organically Polished Coconut Shell & Soft Lined Fine Jute",
    edition: "Beachwear Capsule 02 — Aluva, Kerala Atelier",
    description:
      "A tailored resort beachwear two-piece combining our satin-polished coconut shell halter bra with a structured, cotton-lined fine-weave jute A-line wrap skirt. Accented with a hand-carved coconut ring buckle, three shell buttons, a breezy 15 cm side leg slit, and raw fringe hem.",
    features: [
      "Fine-weave jute-cotton wrap mini skirt with full breathable cotton lining",
      "Hand-carved coconut ring waist buckle with 3 decorative coconut shell buttons",
      "Breezy 15 cm overlapping front slit & coastal fringe hem",
      "Polished with 100% organic virgin coconut oil — water & sun resilient",
      "Interior bra cups fully lined with skin-soft breathable cotton felt"
    ],
    cupStyles: CUP_STYLES,
    skirtOptions: SKIRT_OPTIONS,
    sizes: [
      { size: "FREE SIZE (Adjustable Tie)", stock: 15 },
      { size: "S/M (Style A Cup)", stock: 10 },
      { size: "M/L (Style B Cup)", stock: 11 }
    ],
    tags: [
      "beachwear",
      "jute wrap skirt",
      "coconut shell bikini",
      "resortwear",
      "poolside",
      "aluva",
      "apoorva"
    ]
  }
];

export const BEACH_MOMENTS: BeachMoment[] = [
  {
    id: "moment-sunset",
    title: "Golden Hour Shoreline Walk",
    subtitle: "Sunset Beach Romance",
    occasion: "Couple Beach Stroll",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435607/apoorva/beach_couple_sunset.jpg",
    productId: "apoorva-01-coir-beach-set"
  },
  {
    id: "moment-pool",
    title: "Infinity Pool & Cabana Lounge",
    subtitle: "Tropical Resort Escape",
    occasion: "Daytime Poolside",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_pool_lounge.jpg",
    productId: "apoorva-02-jute-wrap-set"
  },
  {
    id: "moment-gift",
    title: "Honeymoon Villa Surprise",
    subtitle: "Unbox the Island Vibe",
    occasion: "Resort Gift Box",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435608/apoorva/beach_resort_gift.jpg",
    productId: "apoorva-01-coir-beach-set"
  },
  {
    id: "moment-bonfire",
    title: "Midnight Beach Bonfire Luau",
    subtitle: "Made for Island Dancing",
    occasion: "Night Beach Party",
    image: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435606/apoorva/beach_bonfire_party.jpg",
    productId: "apoorva-01-coir-beach-set"
  }
];
