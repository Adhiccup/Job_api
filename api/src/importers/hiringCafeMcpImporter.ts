import axios from "axios";
import type { ImportableJob, ImportSource } from "./types.js";

import { JOB_SEARCH_CONFIG } from "../config/jobSearchConfig.js";

const MCP_URL = "https://hiringcafe.com/api/mcp";

type McpResponse = {
  error?: {
    code: number;
    message: string;
  };
  result?: {
    isError?: boolean;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isHiringCafeMcpSource(source: ImportSource): boolean {
  return source.url.replace(/\/$/, "") === MCP_URL;
}

export async function fetchHiringCafeMcpJobs(
  source: ImportSource,
): Promise<ImportableJob[]> {
  const config = JOB_SEARCH_CONFIG;

  // Start with a small test:
  // Change to config.searchTerms and config.countries
  // after confirming all searches work.
  const searchTerms = config.searchTerms.slice(0, 2);
  const locations = config.countries.slice(0, 2);

  const allJobs: ImportableJob[] = [];
  const seenJobs = new Set<string>();

  let successfulRequests = 0;
  let failedRequests = 0;
  let requestNumber = 0;

  const totalRequests = searchTerms.length * locations.length;

  for (const search of searchTerms) {
    for (const location of locations) {
      requestNumber++;

      console.log(
        `[HiringCafe] ${requestNumber}/${totalRequests} ` +
          `Searching "${search}" in "${location}"`,
      );

      try {
        const response = await axios.post<McpResponse>(
          MCP_URL,
          {
            jsonrpc: "2.0",
            id: requestNumber,
            method: "tools/call",
            params: {
              name: "search_jobs",
              arguments: {
                search,
                location,
                workplace_types: ["Remote"],
                posted_within_days: config.postedWithinDays,
                limit: 25,
              },
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream",
            },
            timeout: 25000,
          },
        );

        if (response.data.error) {
          throw new Error(response.data.error.message);
        }

        if (response.data.result?.isError) {
          throw new Error("MCP tool returned an error");
        }

        const text =
          response.data.result?.content
            ?.filter((item) => item.type === "text")
            .map((item) => item.text ?? "")
            .join("\n") ?? "";

        if (!text) {
          throw new Error("Empty MCP response text");
        }

        const jobs = parseHiringCafeMcpText(source, text);

        successfulRequests++;

        console.log(`[HiringCafe] Received ${jobs.length} parsed jobs`);

        for (const job of jobs) {
          const uniqueKey = job.externalId ?? job.applyUrl;

          if (seenJobs.has(uniqueKey)) {
            continue;
          }

          seenJobs.add(uniqueKey);
          allJobs.push(job);
        }
      } catch (error) {
        failedRequests++;

        console.error(
          `[HiringCafe] Failed: ${search} | ${location}`,
          error instanceof Error ? error.message : error,
        );
      }

      // Wait between requests.
      if (requestNumber < totalRequests) {
        await sleep(config.requestDelayMs);
      }
    }
  }

  console.log("\n===== HIRINGCAFE SUMMARY =====");
  console.log("Total requests:", totalRequests);
  console.log("Successful requests:", successfulRequests);
  console.log("Failed requests:", failedRequests);
  console.log("Unique jobs:", allJobs.length);

  if (successfulRequests === 0) {
    throw new Error("All HiringCafe MCP requests failed");
  }

  return allJobs;
}

export function parseHiringCafeMcpText(
  source: ImportSource,
  text: string,
): ImportableJob[] {
  const headings = [
    ...text.matchAll(/^### \[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/gm),
  ];

  const jobs: ImportableJob[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const start = heading.index ?? 0;

    const end = i + 1 < headings.length ? headings[i + 1].index! : text.length;

    const block = text.slice(start, end);

    const title = heading[1].trim();
    const url = new URL(heading[2]);

    // Remove tracking parameters for stable deduplication.
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }

    const companyName = block.match(/^\*\*(.+?)\*\*\s*$/m)?.[1]?.trim();

    const field = (name: string): string | null => {
      const lines = block.split("\n");

      for (const line of lines) {
        // Remove Markdown bold formatting.
        const cleaned = line.replace(/\*\*/g, "").trim();

        const prefix = `- ${name}:`;

        if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
          return cleaned.slice(prefix.length).trim();
        }
      }

      return null;
    };

    const workplace = field("Workplace");

    if (workplace?.toLowerCase() !== "remote") {
      continue;
    }

    const jobId = field("Job ID");
    const location = field("Location");
    const employmentType = field("Employment type");
    const posted = field("Posted");

    if (!title || !companyName || !jobId) {
      continue;
    }

    const description = block
      .split(/\n\s*-\s*\*{0,2}Job ID\*{0,2}:[^\n]*\n/i)
      .slice(1)
      .join("\n")
      .replace(/\n---\s*$/, "")
      .trim();

    jobs.push({
      sourceId: source.id,
      externalId: jobId,
      title,
      companyName,
      description: description || null,
      applyUrl: url.toString(),
      locationText: location,
      remoteText: "Remote",
      employmentType,
      salaryText: null,
      tags: ["HiringCafe"],
      publishedAt:
        posted && !Number.isNaN(Date.parse(posted)) ? new Date(posted) : null,
      expiresAt: null,
    });
  }

  return jobs;
}
