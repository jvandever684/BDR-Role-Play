import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BDR Voice Roleplay",
  description: "Dealerlogix + Text2Drive voice roleplay app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
