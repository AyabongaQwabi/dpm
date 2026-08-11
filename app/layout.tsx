import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-S6KGE15QR4";

const bodySans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const displaySans = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const dataMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
});

const VERTICAL_CLASS: Record<string, string> = {
  events: "vertical-events",
  cleaning: "vertical-cleaning",
  security: "vertical-security",
  legal: "vertical-legal",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://servicepros.co.za"),
  title: {
    default: "ServicePros — Find trusted local providers in South Africa",
    template: "%s | ServicePros",
  },
  description:
    "Find, compare and hire trusted South African service providers. Browse verified profiles, reviews, and services from Cape Town to Joburg.",
  applicationName: "ServicePros",
  authors: [{ name: "Namoota Technology", url: "https://servicepros.co.za" }],
  creator: "Namoota Technology",
  publisher: "Namoota Technology",
  keywords: [
    "service providers",
    "South Africa",
    "marketplace",
    "hire local services",
    "verified providers",
    "Cape Town",
    "Johannesburg",
  ],
  alternates: {
    canonical: "https://servicepros.co.za",
    languages: { "en-ZA": "https://servicepros.co.za" },
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: "https://servicepros.co.za",
    siteName: "ServicePros",
    title: "ServicePros — Find trusted local providers in South Africa",
    description:
      "Find, compare and hire trusted South African service providers. Browse verified profiles, reviews, and services from Cape Town to Joburg.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "ServicePros — trusted South African service providers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ServicePros — Find trusted local providers in South Africa",
    description:
      "Find, compare and hire trusted South African service providers. Browse verified profiles, reviews, and services.",
    images: ["/images/og-default.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "business",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const categorySlug = hdrs.get("x-tenant-category-slug");
  const verticalClass = categorySlug ? VERTICAL_CLASS[categorySlug] ?? "" : "";

  return (
    <html
      lang="en"
      className={`${bodySans.variable} ${displaySans.variable} ${dataMono.variable} ${verticalClass} h-full bg-background antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (dark) document.documentElement.classList.add('dark');
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
