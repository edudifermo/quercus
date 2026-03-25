//src/app/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quercus ERP",
  description: "ERP multiempresa para comercial, operaciones, tesorería, contabilidad y consolidación.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#eef2ee] text-slate-950 antialiased">{children}</body>
    </html>
  );
}
