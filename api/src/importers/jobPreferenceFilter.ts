
import { JOB_SEARCH_CONFIG as config } from "../config/jobSearchConfig.js";
import type { ImportableJob } from "./types.js";

export type JobPreferenceResult = {
  accepted: boolean;
  reason: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function isExcludedCompany(company: string): boolean {
  const normalized = normalize(company);

  return config.excludedCompanies.some(
    (excluded) => normalized === normalize(excluded)
  );
}

function hasAllowedTitle(title: string): boolean {
  return config.allowedTitlePatterns.some(
    (pattern) => pattern.test(title)
  );
}

function hasExcludedTitle(title: string): boolean {
  return config.excludedTitlePatterns.some(
    (pattern) => pattern.test(title)
  );
}

function hasRemoteEvidence(job: ImportableJob): boolean {
  const evidence = [
    job.remoteText,
    job.locationText,
    job.description,
  ]
    .filter(Boolean)
    .join(" ");

  // Reject known non-remote or mixed arrangements.
  if (
    /\b(hybrid|on[-\s]?site|in[-\s]?office|office[-\s]?based|not remote|partially remote)\b/i
      .test(evidence)
  ) {
    return false;
  }

  // "Remote source: LinkedIn" is a search label,
  // not proof that the individual job is remote.
  const withoutSourceLabel = evidence.replace(
    /\bremote source:\s*linkedin\b/gi,
    ""
  );

  return /\b(remote|work from home|work from anywhere|distributed team|location independent)\b/i
    .test(withoutSourceLabel);
}

export function checkJobPreferences(
  job: ImportableJob,
  now = new Date()
): JobPreferenceResult {
  const title = job.title?.trim() ?? "";
  const company = job.companyName?.trim() ?? "";

  if (!title || !company) {
    return {
      accepted: false,
      reason: "Missing title or company",
    };
  }

  if (isExcludedCompany(company)) {
    return {
      accepted: false,
      reason: `Excluded company: ${company}`,
    };
  }

  if (hasExcludedTitle(title)) {
    return {
      accepted: false,
      reason: `Excluded job title: ${title}`,
    };
  }

  if (!hasAllowedTitle(title)) {
    return {
      accepted: false,
      reason: `Not an allowed job title: ${title}`,
    };
  }

  if (config.remoteOnly && !hasRemoteEvidence(job)) {
    return {
      accepted: false,
      reason: "Remote work not verified",
    };
  }

  if (!job.publishedAt) {
    return {
      accepted: false,
      reason: "Missing publication date",
    };
  }

  const publishedAt = new Date(job.publishedAt);
  const publishedTime = publishedAt.getTime();
  const ageMs = now.getTime() - publishedTime;

  if (Number.isNaN(publishedTime)) {
    return {
      accepted: false,
      reason: "Invalid publication date",
    };
  }

  // Tolerate small clock differences.
  if (ageMs < -60 * 60 * 1000) {
    return {
      accepted: false,
      reason: "Publication date is in the future",
    };
  }

  const maxAgeMs =
    config.postedWithinDays * 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    return {
      accepted: false,
      reason: `Job older than ${config.postedWithinDays} day(s)`,
    };
  }

  return {
    accepted: true,
    reason: null,
  };
}
