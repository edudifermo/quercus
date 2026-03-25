import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ROLE_PERMISSIONS: Record<MembershipRole, string[]> = {
  OWNER: ["dashboard.read", "commercial.read", "commercial.write", "operations.read", "operations.write", "treasury.read", "treasury.write", "accounting.read", "accounting.write", "reports.read", "config.read", "config.write"],
  PLANNER: ["dashboard.read", "commercial.read", "commercial.write", "operations.read", "operations.write", "treasury.read", "treasury.write", "accounting.read", "reports.read", "config.read"],
  OPERATOR: ["dashboard.read", "commercial.read", "operations.read", "operations.write", "treasury.read", "reports.read"],
  VIEWER: ["dashboard.read", "commercial.read", "operations.read", "treasury.read", "reports.read"],
};

export type ActiveContext = {
  user: { id: string; name: string; email: string };
  company: { id: string; name: string; slug: string };
  membership: { role: MembershipRole; permissions: string[] };
  consolidation?: { id: string; name: string };
  availableCompanies: number;
};

export async function resolveActiveContext(searchParams?: { user?: string; company?: string; group?: string }): Promise<ActiveContext> {
  const memberships = await prisma.membership.findMany({ include: { user: true, company: true } });
  if (!memberships.length) throw new Error("No hay memberships configuradas para construir el contexto ERP.");

  const selected = memberships.find((m) => (!searchParams?.user || m.user.email === searchParams.user) && (!searchParams?.company || m.company.slug === searchParams.company)) ?? memberships[0];

  const groups = await prisma.consolidationGroupMembership.findMany({
    where: { userId: selected.user.id, consolidationGroup: { isActive: true } },
    include: { consolidationGroup: true },
  });

  const group = searchParams?.group ? groups.find((g) => g.consolidationGroupId === searchParams.group)?.consolidationGroup : undefined;

  return {
    user: { id: selected.user.id, name: selected.user.name, email: selected.user.email },
    company: { id: selected.company.id, name: selected.company.name, slug: selected.company.slug },
    membership: { role: selected.role, permissions: ROLE_PERMISSIONS[selected.role] },
    consolidation: group ? { id: group.id, name: group.name } : undefined,
    availableCompanies: memberships.filter((m) => m.userId === selected.userId).length,
  };
}

export async function listAccessOptions() {
  const memberships = await prisma.membership.findMany({ include: { user: true, company: true }, orderBy: [{ user: { name: "asc" } }, { company: { name: "asc" } }] });
  const users = memberships.reduce<Record<string, { email: string; name: string }>>((acc, m) => {
    acc[m.user.id] = { email: m.user.email, name: m.user.name };
    return acc;
  }, {});

  const groupMemberships = await prisma.consolidationGroupMembership.findMany({ where: { consolidationGroup: { isActive: true } }, include: { consolidationGroup: true, user: true } });
  const groupsByUserEmail = groupMemberships.reduce<Record<string, Array<{ id: string; name: string }>>>((acc, row) => {
    acc[row.user.email] ??= [];
    acc[row.user.email].push({ id: row.consolidationGroup.id, name: row.consolidationGroup.name });
    return acc;
  }, {});

  return {
    users: Object.values(users),
    memberships: memberships.map((m) => ({ userEmail: m.user.email, userName: m.user.name, companySlug: m.company.slug, companyName: m.company.name, role: m.role })),
    groupsByUserEmail,
  };
}
