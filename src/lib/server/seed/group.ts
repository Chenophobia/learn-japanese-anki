import type { ChapterKind, SeedChapter, SeedUnit } from './types';

export type ChapterSpec = {
  title: string;
  kind: ChapterKind;
  /** Exact `title` of each unit in this chapter, in teaching order. */
  unitTitles: string[];
};

/**
 * Builds chapters from a flat pool of units by naming which units go where.
 *
 * The obvious alternative — slicing the pool by index — silently reassigns
 * units whenever the pool's order changes, and nothing about the running app
 * looks wrong afterwards. Every way of getting this wrong throws here
 * instead: an unknown title, a unit claimed twice, a unit claimed by nobody.
 * That last one is the important one, and it is why the function needs the
 * whole pool rather than just the specs.
 */
export function groupIntoChapters(pool: SeedUnit[], specs: ChapterSpec[]): SeedChapter[] {
  const byTitle = new Map(pool.map((u) => [u.title, u]));
  if (byTitle.size !== pool.length) {
    throw new Error('groupIntoChapters: duplicate unit titles in pool — titles are the key');
  }

  const used = new Set<string>();
  const chapters = specs.map((spec) => ({
    title: spec.title,
    kind: spec.kind,
    units: spec.unitTitles.map((title) => {
      const found = byTitle.get(title);
      if (!found) throw new Error(`groupIntoChapters: no unit titled "${title}"`);
      if (used.has(title)) throw new Error(`groupIntoChapters: unit "${title}" used twice`);
      used.add(title);
      return found;
    })
  }));

  const orphans = pool.filter((u) => !used.has(u.title)).map((u) => u.title);
  if (orphans.length > 0) {
    throw new Error(`groupIntoChapters: units left out of every chapter: ${orphans.join(', ')}`);
  }

  return chapters;
}
