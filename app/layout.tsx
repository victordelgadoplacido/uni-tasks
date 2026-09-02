import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uni Tasks",
  description: "Organize tasks across your university modules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
