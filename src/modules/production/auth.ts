import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ROLE_PERMISSIONS: Record<MembershipRole, string[]> = {
  OWNER: [
    "production.read",
    "production.write",
    "production.close",
    "treasury.read",
    "treasury.write",
    "treasury.pay",
    "attachments.write",
    "reports.read",
  ],
  PLANNER: [
    "production.read",
    "production.write",
    "treasury.read",
    "treasury.write",
    "treasury.pay",
    "attachments.write",
    "reports.read",
  ],
  OPERATOR: [
    "production.read",
    "production.write",
    "treasury.read",
    "treasury.write",
    "attachments.write",
    "reports.read",
  ],
  VIEWER: ["production.read", "treasury.read", "reports.read"],
};

export type AppContext = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    role: MembershipRole;
    permissions: string[];
  };
};

export async function getAppContext(searchParams?: {
  user?: string;
  company?: string;
}): Promise<AppContext> {

  const memberships = await prisma.membership.findMany({
    include: {
      user: true,
      company: true,
    },
  });

  if (memberships.length === 0) {
    throw new Error("No hay accesos configurados. Verificá la configuración inicial del sistema");
  }

  let activeMembership;

  if (searchParams?.user && searchParams?.company) {
    activeMembership = memberships.find(
      (m) =>
        m.user.email === searchParams.user &&
        m.company.slug === searchParams.company
    );
  }

  if (!activeMembership) {
    activeMembership = memberships[0];
  }

  return {
    user: {
      id: activeMembership.user.id,
      name: activeMembership.user.name,
      email: activeMembership.user.email,
    },
    company: {
      id: activeMembership.company.id,
      name: activeMembership.company.name,
      slug: activeMembership.company.slug,
    },
    membership: {
      role: activeMembership.role,
      permissions: ROLE_PERMISSIONS[activeMembership.role],
    },
  };
}

export function requirePermission(context: AppContext, permission: string) {
  if (!context.membership.permissions.includes(permission)) {
    throw new Error(`Permiso insuficiente: ${permission}`);
  }
}

export async function listAvailableContexts() {
  const memberships = await prisma.membership.findMany({
    include: {
      user: true,
      company: true,
    },
    orderBy: [{ company: { name: "asc" } }, { user: { name: "asc" } }],
 
  });

  return memberships.map((m) => ({
    userEmail: m.user.email,
    userName: m.user.name,
    companySlug: m.company.slug,
    companyName: m.company.name,
    role: m.role,
  }));
}