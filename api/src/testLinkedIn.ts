
import "dotenv/config";

import { prisma } from "./lib/prisma.js";
import { fetchLinkedInJobs } from "./importers/linkedinImporter.js";
import { checkJobPreferences } from "./importers/jobPreferenceFilter.js";
import { matchJob } from "./matching/jobMatcher.js";

async function main() {
  const sources = await prisma.jobSource.findMany({
    where: {
      enabled: true,
      url: {
        contains: "linkedin.com",
      },
    },
  });

  console.log("Enabled LinkedIn sources:", sources.length);

  if (sources.length === 0) {
    console.log("No enabled LinkedIn source found.");
    return;
  }

  // Test only the first enabled source.
  const source = sources[0];

  console.log("Testing:", source.name);
  console.log("URL:", source.url);

  const jobs = await fetchLinkedInJobs(source);

  console.log("LinkedIn jobs returned:", jobs.length);

  for (const job of jobs) {
    const preference = checkJobPreferences(job);
    const match = matchJob(job);

    console.log("\n------------------");
    console.log("Title:", job.title);
    console.log("Company:", job.companyName);
    console.log("Location:", job.locationText);
    console.log("Remote:", job.remoteText);
    console.log("Published:", job.publishedAt);
    console.log("Preference accepted:", preference.accepted);
    console.log("Preference reason:", preference.reason);
    console.log("Matcher accepted:", match.accepted);
    console.log("Matcher rejection:", match.rejectionReasons);
  }
}

main()
  .catch((error) => {
    console.error("LinkedIn test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
