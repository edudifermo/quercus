import Link from "next/link";
import { listAccessOptions } from "@/modules/app-context/service";

export default async function AccessPage() {
  const options = await listAccessOptions();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ingreso y contexto</p>
        <h1 className="mt-2 text-3xl font-semibold">Quercus ERP · Selección de empresa / actividad</h1>
        <p className="mt-2 text-sm text-slate-600">Este flujo no simula seguridad empresarial inexistente: permite seleccionar contexto real sobre memberships configuradas.</p>
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">1) Usuario y empresa</h2>
        <div className="mt-3 space-y-3">
          {options.memberships.map((option) => {
            const groups = options.groupsByUserEmail[option.userEmail] ?? [];
            return (
              <article key={`${option.userEmail}-${option.companySlug}`} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm"><strong>{option.userName}</strong> ({option.userEmail}) · <strong>{option.companyName}</strong> · Rol {option.role}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white" href={`/dashboard?user=${option.userEmail}&company=${option.companySlug}`}>
                    Entrar por empresa
                  </Link>
                  {groups.map((group) => (
                    <Link key={group.id} className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800" href={`/dashboard?user=${option.userEmail}&company=${option.companySlug}&group=${group.id}`}>
                      Entrar con grupo {group.name}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
