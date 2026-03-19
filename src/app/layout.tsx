import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quercus · Producción",
  description: "Módulo base de producción con composición, OF, consumos, faltantes y trazabilidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
