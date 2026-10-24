import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/pwa/sw-register";
import { titillium } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Gestion Église",
  description: "Application de gestion des départements d'église",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Bleu de la marque (--primary), couleur de l'en-tete.
  themeColor: "#5462CF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={titillium.variable}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
