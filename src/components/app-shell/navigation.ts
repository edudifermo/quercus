export type ShellModuleId =
  | "dashboard"
  | "produccion"
  | "comercial"
  | "tesoreria"
  | "contabilidad"
  | "fiscal"
  | "reportes"
  | "configuracion";

export type ShellNavItem = {
  id: ShellModuleId;
  label: string;
  href: string;
  description: string;
};

export const SHELL_NAV_ITEMS: ShellNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", description: "Entrada general ERP" },
  { id: "produccion", label: "Producción", href: "/produccion", description: "Órdenes, consumos y stock" },
  { id: "comercial", label: "Comercial", href: "/comercial", description: "Clientes, documentos y cobranzas" },
  { id: "tesoreria", label: "Tesorería", href: "/tesoreria", description: "Caja, bancos y pagos" },
  { id: "contabilidad", label: "Contabilidad", href: "/contabilidad", description: "Base contable y asientos" },
  { id: "fiscal", label: "Fiscal", href: "/fiscal", description: "Impuestos y obligaciones" },
  { id: "reportes", label: "Reportes", href: "/reportes", description: "Vistas operativas y consolidación" },
  { id: "configuracion", label: "Configuración", href: "/configuracion", description: "Empresas, usuarios y parámetros" },
];
