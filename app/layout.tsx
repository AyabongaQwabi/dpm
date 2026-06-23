import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Service Pros",
    template: "%s | Service Pros",
  },
  description:
    "South Africa's home for trusted local providers — events, cleaning, security, legal and more, township to suburb, Cape Town to Joburg.",
  icons: {
    icon: "/images/logo-mark.png",
    apple: "/images/logo-mark.png",
  },
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
      </body>
    </html>
  );
}
