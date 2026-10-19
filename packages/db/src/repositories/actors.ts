import { PrismaClient, Actor } from "@prisma/client";

export async function findActorById(
  prisma: PrismaClient,
  id: string
): Promise<Actor | null> {
  return prisma.actor.findUnique({
    where: { id },
  });
}

export async function findActorByIssuerSubject(
  prisma: PrismaClient,
  issuer: string,
  subject: string
): Promise<Actor | null> {
  return prisma.actor.findUnique({
    where: {
      issuer_subject: { issuer, subject },
    },
  });
}
