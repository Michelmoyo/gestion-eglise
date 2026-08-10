import { Titillium_Web } from "next/font/google";

// Police du corps de texte du rapport mensuel imprimable — la seconde
// police (Doubleplus, titres de section) est auto-hebergee separement en
// @font-face dans rapport-pdf.module.css (public/fonts/doubleplus.otf).
export const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});
