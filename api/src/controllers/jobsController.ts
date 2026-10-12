import type { Request, Response } from "express";
import { JobStatus } from "@prisma/client";
import { fetchLiveMatchedJobs } from "../importers/liveJobFallback.js";
import { prisma } from "../lib/prisma.js";

type JobCursor = {
  publishedAt: string;
  id: string;
};

function encodeCursor(cursor: JobCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string): JobCursor {
  const decoded = Buffer.from(value, "base64url").toString("utf8");

  const parsed = JSON.parse(decoded) as unknown;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("publishedAt" in parsed) ||
    !("id" in parsed) ||
    typeof parsed.publishedAt !== "string" ||
    typeof parsed.id !== "string"
  ) {
    throw new Error("Invalid cursor");
  }

  const cursorDate = new Date(parsed.publishedAt);

  if (Number.isNaN(cursorDate.getTime())) {
    throw new Error("Invalid cursor date");
  }

  return {
    publishedAt: parsed.publishedAt,
    id: parsed.id,
  };
}

export async function getJobs(req: Request, res: Response) {
  const requestedLimit = Number(req.query.limit ?? 20);

  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 20;

  const cursorValue =
    typeof req.query.cursor === "string"
      ? req.query.cursor
      : typeof req.query.starting_after === "string"
        ? req.query.starting_after
        : undefined;

  let cursor: JobCursor | null = null;

  if (cursorValue) {
    try {
      cursor = decodeCursor(cursorValue);
    } catch {
      return res.status(400).json({
        error: "Invalid pagination cursor",
      });
    }
  }
  try {
    const cursorDate = cursor ? new Date(cursor.publishedAt) : null;
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          status: JobStatus.ACTIVE,
          publishedAt: {
            not: null,
          },
          ...(cursor && cursorDate
            ? {
                OR: [
                  {
                    publishedAt: {
                      lt: cursorDate,
                    },
                  },
                  {
                    publishedAt: cursorDate,
                    id: {
                      lt: cursor.id,
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],

        take: limit + 1,

        select: {
          id: true,
          title: true,
          companyName: true,
          applyUrl: true,
          locationText: true,
          remoteText: true,
          totalScore: true,
          apacScore: true,
          relevanceScore: true,
          matchReasons: true,
          tags: true,
          publishedAt: true,
          firstSeenAt: true,
          source: {
            select: {
              id: true,
              name: true,
              type: true,
              url: true,
            },
          },
        },
      }),

      prisma.job.count({
        where: {
          status: JobStatus.ACTIVE,
          publishedAt: {
            not: null,
          },
        },
      }),
    ]);
    
    const hasMore = jobs.length > limit;

    const data = hasMore ? jobs.slice(0, limit) : jobs;

    const lastJob = data.at(-1);

    const nextCursor =
      hasMore && lastJob && lastJob.publishedAt
        ? encodeCursor({
            publishedAt: lastJob.publishedAt.toISOString(),
            id: lastJob.id,
          })
        : null;

    res.json({
      data,
      pagination: {
        has_more: hasMore,
        next_cursor: nextCursor,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error(error);
    const liveJobs = await fetchLiveMatchedJobs();
    res.setHeader("X-Jobs-Source", "live-fallback");
    res.json({ data: liveJobs });
  }
}
