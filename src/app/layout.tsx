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
  metadataBase: new URL(
    process.env.SITE_URL || "https://www.apoorvashells.com"
  ),
  title: "APOORVA SHELLS™ — Handcrafted Coconut & Coir Coastal Resortwear (Aluva, Kerala)",
  description:
    "Discover APOORVA SHELLS' signature handcrafted coastal resortwear and artisanal beach apparel from our Aluva, Kerala Atelier: natural coconut shell tops, combed coir fringe skirts, and fine handloom jute wraps.",
  keywords: [
    "APOORVA SHELLS",
    "apoorvashells",
    "coastal resortwear",
    "tropical beachwear",
    "handcrafted coconut shell craft",
    "coir fringe beach skirt",
    "jute wrap skirt",
    "luxury resort apparel",
    "kerala handicraft fashion"
  ],
  authors: [{ name: "APOORVA SHELLS" }],
  creator: "APOORVA SHELLS",
  publisher: "APOORVA SHELLS",
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
    url: "https://www.apoorvashells.com",
    siteName: "APOORVA SHELLS",
    title: "APOORVA SHELLS™ // Handcrafted Coastal Resortwear & Kerala Artisanal Apparel",
    description:
      "Explore APOORVA SHELLS' Sustainable Coconut, Coir & Handwoven Jute Coastal Resortwear Collection — 100% Handcrafted & Biodegradable in Aluva, Kerala.",
    images: [
      {
        url: "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435598/apoorva/apoorva_coconut_set.png",
        width: 1024,
        height: 578,
        alt: "APOORVA SHELLS Handcrafted Coconut & Jute Coastal Resortwear Set"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "APOORVA SHELLS™ — Handcrafted Coastal Resortwear & Kerala Artisanal Apparel",
    description:
      "Sustainable coastal resortwear combining natural polished coconut craft, tender coir, and handwoven jute fabrics from Aluva, Kerala.",
    images: [
      "https://res.cloudinary.com/oiu0lhfe/image/upload/v1793435598/apoorva/apoorva_coconut_set.png"
    ]
  },
  alternates: {
    canonical: "https://www.apoorvashells.com"
  },
  facebook: {
    appId: "1063008853460924"
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
