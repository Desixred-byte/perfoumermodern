import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { getCurrentLocale } from "@/lib/i18n.server";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perfoumer | Onlayn Ətirlər Mağazası - Lüks və Uzunömürlü Ətirlər",
  description:
    "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
  icons: {
    icon: "/logo.webp",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
  openGraph: {
    title: "Perfoumer | Onlayn Ətirlər Mağazası - Lüks və Uzunömürlü Ətirlər",
    description:
      "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
    type: "website",
    images: [
      {
        url: "https://images-ext-1.discordapp.net/external/56LRNc2XGElyxjUEbRHDFuJJemiVwFe4EFREJU718Bk/https/framerusercontent.com/images/XG0jkQuFqFc9mFYgLTyUHvBGMeA.png?format=webp&quality=lossless&width=1404&height=787",
        width: 1404,
        height: 787,
        alt: "Perfoumer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perfoumer | Onlayn Ətirlər Mağazası - Lüks və Uzunömürlü Ətirlər",
    description:
      "Perfoumer-də orijinal və uzunömürlü kişi və qadın ətirlərini kəşf edin. Lüks, niş və dizayner brendləri, sürətli çatdırılma və xüsusi kolleksiyalar - hamısı bir onlayn ətir mağazasında.",
    images: [
      "https://images-ext-1.discordapp.net/external/56LRNc2XGElyxjUEbRHDFuJJemiVwFe4EFREJU718Bk/https/framerusercontent.com/images/XG0jkQuFqFc9mFYgLTyUHvBGMeA.png?format=webp&quality=lossless&width=1404&height=787",
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell locale={locale}>{children}</AppShell>
      </body>
    </html>
  );
}
