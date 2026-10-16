import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.job.deleteMany({});

  console.log(`Deleted ${result.count} jobs.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });