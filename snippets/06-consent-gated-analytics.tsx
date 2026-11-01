// components/Analytics.tsx
// Observed: GA4 (G-LK6CQWCWX0) loads unconditionally on first paint.
// Load it only after consent, and after the page is interactive.

"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID!;

export default function Analytics() {
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    setConsent(localStorage.getItem("analytics-consent") === "granted");
  }, []);
  if (!consent) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { anonymize_ip: true });
      `}</Script>
    </>
  );
}
