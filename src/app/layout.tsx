import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quercus · Operación",
  description: "Módulos operativos de producción, tesorería, pagos a proveedores y trazabilidad documental.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
