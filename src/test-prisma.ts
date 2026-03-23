import { prisma } from "./lib/prisma"
import { getAppContext } from "./modules/production/auth"

async function testDb() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`
    console.log("DB OK:", result)

    // 👉 ESTO ES LO QUE TE DIJE
    const ctx = await getAppContext()
    console.log("APP CONTEXT:", ctx)

  } catch (error: any) {
    console.error("DB ERROR message:", error?.message)
  } finally {
    await prisma.$disconnect()
  }
}

testDb()