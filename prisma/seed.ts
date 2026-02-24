import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JOURNEY_NAME = "Visual AI Workshop One";

async function main() {
  let journey = await prisma.workspaceProject.findFirst({
    where: { name: JOURNEY_NAME },
  });

  if (!journey) {
    journey = await prisma.workspaceProject.create({
      data: {
        name: JOURNEY_NAME,
        description: "First Sigil workshop journey.",
      },
    });
    console.log(`Created journey: ${journey.name} (${journey.id})`);
  } else {
    console.log(`Journey already exists: ${journey.name} (${journey.id})`);
  }

  const updated = await prisma.project.updateMany({
    where: { workspaceProjectId: null },
    data: { workspaceProjectId: journey.id },
  });

  if (updated.count > 0) {
    console.log(`Linked ${updated.count} existing route(s) to journey.`);
  }

  const admin = await prisma.profile.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });
  if (admin) {
    await prisma.workspaceProjectMember.upsert({
      where: {
        workspaceProjectId_userId: { workspaceProjectId: journey.id, userId: admin.id },
      },
      create: {
        workspaceProjectId: journey.id,
        userId: admin.id,
        role: "member",
      },
      update: {},
    });
    console.log("Added first admin as journey member.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
