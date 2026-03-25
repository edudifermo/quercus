import Link from "next/link";
import { withTenantQuery, type TenantSearchParams } from "@/components/app-shell/query";

type ModulePlaceholderProps = {
  moduleName: string;
  description: string;
  nextSteps: string[];
  tenantQuery: TenantSearchParams;
  quickLinks?: Array<{ label: string; href: string }>;
};

export function ModulePlaceholder({ moduleName, description, nextSteps, tenantQuery, quickLinks = [] }: ModulePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{moduleName}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Próximos pasos sugeridos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
      {quickLinks.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={withTenantQuery(link.href, tenantQuery)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
