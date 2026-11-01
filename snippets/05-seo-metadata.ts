// app/layout.tsx (metadata only)
// Fixes: duplicated brand in <title>, og:url on apex while pages are served from www,
// no canonical tag, and an SVG og:image (not rendered by LinkedIn / X / WhatsApp / Facebook).

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cynbit.in"),
  title: {
    default: "Cynbit Technologies | AI Automation & Software Solutions, Jaipur",
    template: "%s | Cynbit Technologies",   // child pages no longer repeat the brand
  },
  description:
    "AI automation, autonomous agents and custom software from Jaipur, Rajasthan.",
  alternates: { canonical: "/" },           // one canonical host (www or apex, pick one)
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Cynbit Technologies",
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Cynbit Technologies" }], // PNG/JPG, 1200x630
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};
