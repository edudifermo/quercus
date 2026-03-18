import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "quercus-demo" },
    update: {},
    create: {
      name: "Quercus Demo",
      slug: "quercus-demo",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "owner@quercus.local" },
    update: {},
    create: {
      name: "Quercus Owner",
      email: "owner@quercus.local",
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  console.log("Seed técnico aplicado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
