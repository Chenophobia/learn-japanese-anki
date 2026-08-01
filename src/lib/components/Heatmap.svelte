<script lang="ts">
  /**
   * GitHub-style activity heatmap: 53 columns of 7 UTC days.
   *
   * Degradation on narrow screens: the grid does NOT shrink to fewer weeks.
   * At 320px there is no cell size that fits 53 weekly columns plus row
   * labels without becoming illegible, so the container scrolls
   * horizontally instead (the page itself never scrolls sideways — only
   * this element does). On mount it scrolls itself to the right edge, so a
   * phone user sees "did I keep it up recently" — the days that actually
   * motivate — without having to swipe first. The full year is still one
   * swipe away rather than discarded.
   *
   * Color: a single-hue sequential ramp (the app's own accent blue) at four
   * steps, chosen so magnitude reads by lightness, not by a change of hue.
   * Tokens --color-heat-0..4 are defined per-theme in app.css and validated
   * with the dataviz skill's ordinal-ramp checks (monotone L, >=0.06
   * adjacent step, and the near-surface step clearing 2:1 contrast) in both
   * themes separately, since dark mode flips the anchor (near-surface here
   * is the darkest step, not the lightest).
   */
  import { HEATMAP_WEEKS, heatmapRange, monthLabelColumns } from '$lib/heatmap';

  let { days }: { days: Array<{ date: string; count: number }> } = $props();

  const WEEKS = HEATMAP_WEEKS;
  const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const LEVEL_CLASSES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];

  type Cell = { key: string; count: number; month: number };

  const counts = $derived(new Map(days.map((d) => [d.date, d.count])));
  const max = $derived(Math.max(1, ...days.map((d) => d.count)));

  function isoOf(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  // Pure string formatting (no Date re-parsing, which would risk a
  // local-timezone shift) for the screen-reader-only day list below.
  function formatDay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
  }

  function level(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  }

  const range = heatmapRange(new Date());
  const end = range.endDate;
  const todayKey = isoOf(new Date());

  const weeks: Cell[][] = $derived(
    Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const offset = (WEEKS - 1 - w) * 7 + (6 - d);
        const date = new Date(end);
        date.setUTCDate(date.getUTCDate() - offset);
        const key = isoOf(date);
        return { key, count: counts.get(key) ?? 0, month: date.getUTCMonth() };
      })
    )
  );

  // One label per week-column, shown only when that column starts a new month
  // and has room before the next one — see monthLabelColumns.
  const monthLabels = $derived.by(() => {
    const months = weeks.map((week) => week[0].month);
    return monthLabelColumns(months).map((show, i) => (show ? MONTH_NAMES[months[i]] : ''));
  });

  // stats.ts already queries exactly `range`, so this normally filters
  // nothing. It keeps the component self-consistent for any input: the
  // screen-reader list must never announce a day the grid doesn't draw.
  const visibleDays = $derived(
    days.filter((d) => d.date >= range.start && d.date <= range.end)
  );
  const totalReviews = $derived(visibleDays.reduce((sum, d) => sum + d.count, 0));
  const activeDays = $derived(visibleDays.length);

  let scrollEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    scrollEl?.scrollTo({ left: scrollEl.scrollWidth });
  });
</script>

<div>
  <!--
    Accessible alternative to the visual grid below. The grid itself is
    marked aria-hidden and its per-cell data lives only in `title`
    attributes, which never reach assistive tech inside a hidden subtree —
    so screen-reader/keyboard users get this instead: a real total, plus
    one line per ACTIVE day (never 365 rows of "0 reviews" noise, since
    `days` already only contains non-zero counts), restricted to the same
    date range the grid draws.
  -->
  <p class="sr-only">
    Review activity heatmap: {totalReviews}
    {totalReviews === 1 ? 'review' : 'reviews'} across {activeDays} active {activeDays === 1 ? 'day' : 'days'} in the
    last year.
  </p>
  {#if visibleDays.length > 0}
    <ul class="sr-only">
      {#each visibleDays as d (d.date)}
        <li>{formatDay(d.date)}: {d.count} {d.count === 1 ? 'review' : 'reviews'}</li>
      {/each}
    </ul>
  {/if}

  <!--
    Padding goes on the inner content, not on this scroll container: Safari
    ignores a scroll container's padding-right when computing scrollWidth, so
    the last column would still end up flush against the clipping edge.
    Setting overflow-x also makes overflow-y compute to `auto`, so the today
    cell's 2px ring needs clearance on all four sides, not just the right.
    The extra room on the right also lets the final month label overflow its
    11px column without being cut off.
  -->
  <div bind:this={scrollEl} class="overflow-x-auto" aria-hidden="true">
    <div class="flex w-max gap-1.5 py-1 pr-3 pl-1">
      <div
        class="grid grid-rows-7 gap-[3px] text-right text-[10px] leading-none text-ink-muted"
        style="grid-auto-rows: 11px; margin-top: 16px"
      >
        {#each WEEKDAY_LABELS as label, i (i)}
          <span class="flex h-[11px] w-6 items-center justify-end pr-1">{label}</span>
        {/each}
      </div>

      <div class="flex flex-col gap-1">
        <div class="grid grid-flow-col gap-[3px] text-[10px] text-ink-muted" style="grid-auto-columns: 11px">
          {#each monthLabels as label, i (i)}
            <span class="overflow-visible whitespace-nowrap">{label}</span>
          {/each}
        </div>

        <div class="grid grid-flow-col grid-rows-7 gap-[3px]">
          {#each weeks as week, i (i)}
            {#each week as cell (cell.key)}
              <div
                class="h-[11px] w-[11px] rounded-[2px] {LEVEL_CLASSES[level(cell.count)]} {cell.key === todayKey
                  ? 'ring-1 ring-accent ring-offset-1 ring-offset-paper'
                  : ''}"
                title="{cell.key}: {cell.count} {cell.count === 1 ? 'review' : 'reviews'}"
              ></div>
            {/each}
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-ink-muted" aria-hidden="true">
    <span>Less</span>
    {#each LEVEL_CLASSES as bg (bg)}
      <span class="h-[11px] w-[11px] rounded-[2px] {bg}"></span>
    {/each}
    <span>More</span>
  </div>
</div>
