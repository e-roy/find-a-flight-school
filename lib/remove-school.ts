/**
 * Hard-delete a school and every row that foreign-keys to it. The schema uses
 * plain references (no ON DELETE CASCADE), so child rows must be removed first
 * or the final delete fails. Used by the admin "remove public submission" flow.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { facts } from "@/db/schema/facts";
import { sources } from "@/db/schema/sources";
import { snapshots } from "@/db/schema/snapshots";
import { crawlQueue } from "@/db/schema/crawl_queue";
import { photoHealth } from "@/db/schema/photo_health";
import { signalsMock } from "@/db/schema/signals_mock";
import { schoolEmbeddings } from "@/db/schema/embeddings";
import { claims } from "@/db/schema/claims";
import { leads } from "@/db/schema/leads";
import { savedSchools } from "@/db/schema/saved_schools";
import { eventsViews } from "@/db/schema/events_views";
import { eventsFinancing } from "@/db/schema/events_financing";
import { eventsMatchAppearances } from "@/db/schema/events_match_appearances";

export async function deleteSchoolCascade(schoolId: string): Promise<void> {
  // Children first (order among these doesn't matter — none reference each other).
  await db.delete(facts).where(eq(facts.schoolId, schoolId));
  await db.delete(sources).where(eq(sources.schoolId, schoolId));
  await db.delete(snapshots).where(eq(snapshots.schoolId, schoolId));
  await db.delete(crawlQueue).where(eq(crawlQueue.schoolId, schoolId));
  await db.delete(photoHealth).where(eq(photoHealth.schoolId, schoolId));
  await db.delete(signalsMock).where(eq(signalsMock.schoolId, schoolId));
  await db.delete(schoolEmbeddings).where(eq(schoolEmbeddings.schoolId, schoolId));
  await db.delete(claims).where(eq(claims.schoolId, schoolId));
  await db.delete(leads).where(eq(leads.schoolId, schoolId));
  await db.delete(savedSchools).where(eq(savedSchools.schoolId, schoolId));
  await db.delete(eventsViews).where(eq(eventsViews.schoolId, schoolId));
  await db.delete(eventsFinancing).where(eq(eventsFinancing.schoolId, schoolId));
  await db
    .delete(eventsMatchAppearances)
    .where(eq(eventsMatchAppearances.schoolId, schoolId));
  // Finally the school itself.
  await db.delete(schools).where(eq(schools.id, schoolId));
}
