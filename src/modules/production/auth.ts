import { MembershipRole } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";

const ROLE_PERMISSIONS: Record<MembershipRole, string[]> = {
  OWNER: ["production.read", "production.write", "production.close", "reports.read"],
  PLANNER: ["production.read", "production.write", "reports.read"],
  OPERATOR: ["production.read", "production.write", "reports.read"],
  VIEWER: ["production.read", "reports.read"],
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
    orderBy: [{ company: { name: "asc" } }, { user: { name: "asc" } }],
  });

  if (memberships.length === 0) {
    throw new Error("No hay memberships configurados. Ejecutá el seed para cargar datos demo.");
  }

  const activeMembership =
    memberships.find(
      (membership) =>
        membership.user.email === searchParams?.user &&
        membership.company.slug === searchParams?.company,
    ) ?? memberships[0];

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

  return memberships.map((membership) => ({
    userEmail: membership.user.email,
    userName: membership.user.name,
    companySlug: membership.company.slug,
    companyName: membership.company.name,
    role: membership.role,
  }));
}
