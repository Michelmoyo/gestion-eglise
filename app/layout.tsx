import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/pwa/sw-register";
import { titillium, poppins } from "@/lib/fonts";

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
  // Violet de la marque (--primary, brief "Soft Cards"), couleur de l'en-tete.
  themeColor: "#6C3CF0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${titillium.variable} ${poppins.variable}`}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
