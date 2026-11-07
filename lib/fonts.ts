import { Titillium_Web, Poppins } from "next/font/google";

// Police du corps de texte du rapport mensuel imprimable — la seconde
// police (Doubleplus, titres de section) est auto-hebergee separement en
// @font-face dans rapport-pdf.module.css (public/fonts/doubleplus.otf).
// Le rapport garde Titillium/Doubleplus (identite propre), l'app utilise
// Poppins (brief "Soft Cards").
export const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});

// Police de l'app (brief "Soft Cards", dossier Drive UX & UI) : Medium
// pour le corps, SemiBold pour les titres -- une seule police, pas de
// police d'affichage separee.
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
