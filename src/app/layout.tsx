import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quercus",
  description: "Base técnica para plataforma multiempresa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
