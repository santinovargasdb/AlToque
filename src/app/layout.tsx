import type { Metadata, Viewport } from "next";
import {
  Inter,
  Bricolage_Grotesque,
  JetBrains_Mono,
} from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar"),
  title: {
    default: "AlToque — Oficios verificados cerca tuyo",
    template: "%s | AlToque",
  },
  description:
    "Plomeros, cerrajeros, electricistas y gasistas verificados con DNI. Urgencias 24/7 y trabajos agendados en el Gran Buenos Aires.",
  applicationName: "AlToque",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AlToque",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "AlToque",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bricolage.variable} ${jetbrains.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
