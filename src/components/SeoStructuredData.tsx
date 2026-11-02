import { PRODUCTS } from "@/data/products";

export default function SeoStructuredData() {
  const siteUrl = "https://www.apoorvashells.com";
  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "APOORVA SHELLS",
        "url": siteUrl,
        "logo": `${siteUrl}/images/apoorva_logo.svg`,
        "sameAs": [
          "https://instagram.com/apoorva.coastal"
        ],
        "description": "APOORVA SHELLS — Handcrafted coastal resortwear atelier in Aluva, Kerala featuring natural coconut shell, combed coir fringe, and fine jute garments.",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Periyar River Road, Aluva",
          "addressLocality": "Aluva, Ernakulam",
          "addressRegion": "Kerala",
          "postalCode": "683101",
          "addressCountry": "IN"
        }
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "APOORVA SHELLS",
        "description": "Handcrafted Coconut, Coir & Jute Coastal Resortwear // 2-Product Capsule",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        }
      },
      ...PRODUCTS.map((product) => ({
        "@type": "Product",
        "@id": `${siteUrl}/products/${product.id}`,
        "name": product.name,
        "description": product.description,
        "sku": product.sku,
        "image": product.image.startsWith("http")
          ? product.image
          : `${siteUrl}${product.image}`,
        "brand": {
          "@type": "Brand",
          "name": "APOORVA SHELLS"
        },
        "color": product.color,
        "material": product.material,
        "offers": {
          "@type": "Offer",
          "url": `${siteUrl}/products/${product.id}`,
          "priceCurrency": "INR",
          "price": product.price,
          "availability": "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
          "priceValidUntil": "2027-12-31",
          "seller": {
            "@id": `${siteUrl}/#organization`
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "reviewCount": "46"
        }
      }))
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
    />
  );
}
