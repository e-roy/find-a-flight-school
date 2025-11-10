import type { Metadata } from "next";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { eq, desc, and } from "drizzle-orm";
import { FACT_KEYS } from "@/types";
import { extractPhotoUrls } from "@/lib/utils-photos";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const school = await db.query.schools.findFirst({
    where: (q, { eq }) => eq(q.id, id),
  });

  if (!school) {
    return {
      title: "School Not Found",
      description: "The requested flight school could not be found.",
    };
  }

  // Get latest approved facts
  const allFacts = await db.query.facts.findMany({
    where: (q, { eq, and }) =>
      and(
        eq(q.schoolId, id),
        eq(q.moderationStatus, "APPROVED")
      ),
    orderBy: [desc(facts.asOf)],
  });

  // Get latest fact per key
  const latestFactsByKey = new Map<string, (typeof allFacts)[0]>();
  for (const fact of allFacts) {
    if (!latestFactsByKey.has(fact.factKey)) {
      latestFactsByKey.set(fact.factKey, fact);
    }
  }

  // Extract relevant facts for metadata
  const programs: string[] = [];
  const programFacts = Array.from(latestFactsByKey.values()).filter(
    (f) => f.factKey === FACT_KEYS.PROGRAM_TYPE
  );
  for (const fact of programFacts) {
    if (typeof fact.factValue === "string") {
      programs.push(fact.factValue);
    }
  }

  const costBandFact = latestFactsByKey.get(FACT_KEYS.COST_BAND);
  const costBand =
    costBandFact && typeof costBandFact.factValue === "string"
      ? costBandFact.factValue
      : undefined;

  const addressFact = latestFactsByKey.get(FACT_KEYS.LOCATION_ADDRESS);
  const address =
    addressFact && typeof addressFact.factValue === "string"
      ? addressFact.factValue
      : undefined;

  const photosFact = latestFactsByKey.get(FACT_KEYS.PHOTOS);
  const photos = photosFact ? extractPhotoUrls(photosFact.factValue) : undefined;
  const ogImage = photos && photos.length > 0 ? photos[0] : "/images/hero.png";

  // Build description
  const descriptionParts: string[] = [];
  if (programs.length > 0) {
    descriptionParts.push(`Offers ${programs.join(", ")} programs`);
  }
  if (costBand) {
    descriptionParts.push(`${costBand.toLowerCase()} cost range`);
  }
  if (address) {
    descriptionParts.push(`Located in ${address}`);
  }
  const description =
    descriptionParts.length > 0
      ? `${school.canonicalName}. ${descriptionParts.join(". ")}. View detailed information, programs, pricing, and contact details.`
      : `${school.canonicalName} flight school. View detailed information, programs, pricing, and contact details.`;

  return {
    title: `${school.canonicalName} - Flight School Profile`,
    description,
    keywords: [
      school.canonicalName,
      "flight school",
      "pilot training",
      ...programs,
      address ? address : [],
    ].flat(),
    openGraph: {
      title: `${school.canonicalName} - Flight School Profile`,
      description,
      type: "website",
      url: `${baseUrl}/schools/${id}`,
      siteName: "Find a Flight School",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${school.canonicalName} - Flight School`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${school.canonicalName} - Flight School Profile`,
      description,
      images: [ogImage],
    },
  };
}

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

