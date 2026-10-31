import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import SeoStructuredData from "@/components/SeoStructuredData";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://apoorva.store"),
  title: "APOORVA™ — Handcrafted Coconut & Coir Tropical Beachwear (Aluva, Kerala)",
  description:
    "Discover APOORVA's signature handcrafted beachwear sets from our Aluva, Kerala Atelier: the Coconut & Coir Fringe Beach Set and the Coconut & Fine Jute Wrap Beach Set.",
  keywords: [
    "APOORVA",
    "tropical beachwear",
    "coconut shell bra",
    "coir fringe beach skirt",
    "raw jute wrap skirt",
    "luxury resortwear",
    "beach bonfire outfit"
  ],
  authors: [{ name: "APOORVA Atelier" }],
  creator: "APOORVA",
  publisher: "APOORVA",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://apoorva.store",
    siteName: "APOORVA Atelier",
    title: "APOORVA™ // Exotic Innerwear Atelier",
    description:
      "Explore the Signature Coconut & Raw Jute Exotic Innerwear Set — 100% Handcrafted & Biodegradable.",
    images: [
      {
        url: "/images/apoorva_coconut_set.png",
        width: 1024,
        height: 578,
        alt: "APOORVA Coconut & Raw Jute Exotic Innerwear Set"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "APOORVA™ — Exotic Innerwear & Artisanal Coconut Atelier",
    description:
      "Handcrafted exotic innerwear combining raw natural coconut shell and handwoven jute textures.",
    images: ["/images/apoorva_coconut_set.png"]
  },
  alternates: {
    canonical: "https://apoorva.store"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <SeoStructuredData />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#141414] overflow-x-hidden selection:bg-black selection:text-white">
        {children}
        <FirebaseAnalytics />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
