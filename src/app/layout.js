import { Bungee } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Femzoo Wallpaper",
  description: "Website wallpaper modern dengan Next.js.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
