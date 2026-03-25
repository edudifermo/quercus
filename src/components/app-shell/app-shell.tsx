import Link from "next/link";
import type { ReactNode } from "react";
import type { MembershipRole } from "@prisma/client";
import type { ConsolidationGroupForUser } from "@/modules/consolidation/types";
import type { AppContext } from "@/modules/production/auth";
import { SHELL_NAV_ITEMS, type ShellModuleId } from "@/components/app-shell/navigation";
import { withTenantQuery } from "@/components/app-shell/query";

type ContextOption = {
  userEmail: string;
  userName: string;
  companySlug: string;
  companyName: string;
  role: MembershipRole;
};

type AppShellProps = {
  context: AppContext;
  activeModule: ShellModuleId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  contextOptions: ContextOption[];
  consolidationGroups?: ConsolidationGroupForUser[];
  activeGroupId?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

export function AppShell({
  context,
  activeModule,
  title,
  subtitle,
  children,
  contextOptions,
  consolidationGroups = [],
  activeGroupId,
  breadcrumbs,
}: AppShellProps) {
  const tenantQuery = {
    company: context.company.slug,
    user: context.user.email,
    group: activeGroupId,
  };

  const userContextOptions = contextOptions.filter((option) => option.userEmail === context.user.email);
  const hasConsolidationAccess = consolidationGroups.length > 0;

  return (
    <div className="min-h-screen bg-[#eef2ee] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[270px_1fr]">
        <aside className="border-r border-emerald-950/10 bg-gradient-to-b from-[#1f3b2f] to-[#172a21] px-5 py-6 text-slate-100">
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-950/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/70">Quercus ERP</p>
            <p className="mt-1 text-xl font-semibold">Sistema multiempresa</p>
            <p className="mt-2 text-xs text-emerald-100/70">Crecimiento, estructura y control para operación diaria.</p>
          </div>

          <nav className="mt-6 space-y-1">
            {SHELL_NAV_ITEMS.map((item) => {
              const isActive = item.id === activeModule;
              return (
                <Link
                  key={item.id}
                  href={withTenantQuery(item.href, tenantQuery)}
                  className={`block rounded-xl border px-3 py-2 transition ${
                    isActive
                      ? "border-emerald-100/40 bg-emerald-100/20 text-white"
                      : "border-transparent text-emerald-50/90 hover:border-emerald-100/20 hover:bg-emerald-100/10"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-emerald-100/70">{item.description}</p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-emerald-100/15 bg-emerald-100/5 p-3 text-xs text-emerald-50/80">
            <p className="font-semibold">Contexto activo</p>
            <p className="mt-1">Empresa: {context.company.name}</p>
            <p>Rol: {context.membership.role}</p>
            {activeGroupId && <p>Grupo: {consolidationGroups.find((group) => group.id === activeGroupId)?.name ?? "Consolidado"}</p>}
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                        {crumb.href ? <Link href={withTenantQuery(crumb.href, tenantQuery)} className="hover:underline">{crumb.label}</Link> : crumb.label}
                        {index < breadcrumbs.length - 1 ? <span>›</span> : null}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <form action="" method="get" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <input type="hidden" name="user" value={context.user.email} />
                  {activeGroupId ? <input type="hidden" name="group" value={activeGroupId} /> : null}
                  <label className="block text-xs text-slate-500">Empresa activa</label>
                  <select
                    name="company"
                    defaultValue={context.company.slug}
                    className="mt-1 w-full bg-transparent font-medium text-slate-800 outline-none"
                  >
                    {userContextOptions.map((option) => (
                      <option key={`${option.userEmail}-${option.companySlug}`} value={option.companySlug}>
                        {option.companyName}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="mt-1 text-xs font-semibold text-emerald-900">
                    Cambiar
                  </button>
                </form>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">Usuario / rol</p>
                  <p className="font-medium text-slate-800">{context.user.name}</p>
                  <p className="text-xs text-slate-600">{context.membership.role}</p>
                </div>

                {hasConsolidationAccess ? (
                  <form action="" method="get" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <input type="hidden" name="company" value={context.company.slug} />
                    <input type="hidden" name="user" value={context.user.email} />
                    <label className="block text-xs text-slate-500">Vista consolidada</label>
                    <select
                      name="group"
                      defaultValue={activeGroupId ?? consolidationGroups[0]?.id}
                      className="mt-1 w-full bg-transparent font-medium text-slate-800 outline-none"
                    >
                      {consolidationGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="mt-1 text-xs font-semibold text-emerald-900">
                      Aplicar
                    </button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Sin grupo consolidado asignado.
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
