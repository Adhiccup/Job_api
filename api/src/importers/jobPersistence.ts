import { JobStatus, type PrismaClient } from "@prisma/client";
import { matchJob, toJobScoreUpdate } from "../matching/jobMatcher.js";
import type { ImportableJob } from "./types.js";
import { checkJobPreferences } from "./jobPreferenceFilter.js";

export type SaveImportedJobResult = {
  saved: boolean;
  active: boolean;
};

export async function saveImportedJob(
  prisma: PrismaClient,
  job: ImportableJob,
): Promise<SaveImportedJobResult> {
  const preference = checkJobPreferences(job);

  if (!preference.accepted) {
    console.log(
      `[Job Filter] Rejected: ${job.title} | ` +
        `${job.companyName ?? "Unknown"} | ` +
        `${preference.reason}`,
    );

    return {
      saved: false,
      active: false,
    };
  }
  const match = matchJob(job);
  if (!match.accepted) {
    return {
      saved: false,
      active: false,
    };
  }

  if (!match.accepted) {
    return { saved: false, active: false };
  }

  // Check for an existing job with the same title and company.
  const normalizedTitle = job.title.trim().toLowerCase();
  const normalizedCompany = (job.companyName ?? "").trim().toLowerCase();

  if (!normalizedTitle || !normalizedCompany) {
    console.log(`Skipping job with missing title/company: ${job.title}`);
    return { saved: false, active: false };
  }

  const existingJobs = await prisma.job.findMany({
    where: {
      title: {
        equals: job.title.trim(),
        mode: "insensitive",
      },
      companyName: {
        equals: job.companyName?.trim() ?? "",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      title: true,
      companyName: true,
      applyUrl: true,
    },
  });

  const duplicate = existingJobs.find(
    (existing) =>
      existing.title.trim().toLowerCase() === normalizedTitle &&
      (existing.companyName ?? "").trim().toLowerCase() === normalizedCompany,
  );

  if (duplicate && duplicate.applyUrl !== job.applyUrl) {
    console.log(`Skipping duplicate: ${job.title} - ${job.companyName}`);
    return { saved: false, active: false };
  }
  const scoreUpdate = toJobScoreUpdate(match);
  // const status = match.accepted ? JobStatus.ACTIVE : JobStatus.HIDDEN;
  const now = new Date();

  await prisma.job.upsert({
    where: { applyUrl: job.applyUrl },
    update: {
      title: job.title,
      companyName: job.companyName,
      description: job.description,
      locationText: job.locationText,
      remoteText: job.remoteText,
      employmentType: job.employmentType,
      salaryText: job.salaryText,
      tags: job.tags,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      lastSeenAt: now,
      status: JobStatus.ACTIVE,
      ...scoreUpdate,
    },
    create: {
      sourceId: job.sourceId,
      externalId: job.externalId,
      title: job.title,
      companyName: job.companyName,
      description: job.description,
      applyUrl: job.applyUrl,
      locationText: job.locationText,
      remoteText: job.remoteText,
      employmentType: job.employmentType,
      salaryText: job.salaryText,
      tags: job.tags,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      lastSeenAt: now,
      status: JobStatus.ACTIVE,
      ...scoreUpdate,
    },
  });

  return {
    active: match.accepted,
    saved: true,
  };
}
