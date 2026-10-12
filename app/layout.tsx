import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/pwa/sw-register";

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
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
