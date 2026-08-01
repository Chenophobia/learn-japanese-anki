<script lang="ts">
  import Heatmap from '$lib/components/Heatmap.svelte';
  import MasteryBar from '$lib/components/MasteryBar.svelte';

  let { data } = $props();

  const hasHistory = $derived(data.stats.learned > 0);

  const retentionLabel = $derived(
    data.stats.retention === null ? '—' : `${Math.round(data.stats.retention * 100)}%`
  );
  const retentionNote = $derived(
    data.stats.retention === null
      ? 'Not enough graduated reviews yet'
      : 'of reviews recalled, not marked Again'
  );
  const streakNote = $derived(
    data.stats.streak === 0
      ? 'Study today to start one'
      : data.stats.streak === 1
        ? 'First day — keep it up'
        : 'days running'
  );

  const secondaryTiles = $derived([
    { label: 'Learned', value: data.stats.learned },
    { label: 'Mature', value: data.stats.mature },
    { label: 'Young', value: data.stats.young },
    { label: 'Due today', value: data.stats.dueToday },
    { label: 'Due tomorrow', value: data.stats.dueTomorrow }
  ]);

  const chaptersWithMature = $derived(
    data.chapters.map((chapter) => ({
      ...chapter,
      matureCount: chapter.units.reduce((sum, unit) => sum + unit.mature, 0),
      // Only units you've actually started are worth expanding to look at —
      // an untouched unit is all zeroes and just makes the list longer.
      startedUnits: chapter.units.filter((unit) => unit.introduced > 0)
    }))
  );
</script>

<svelte:head>
  <title>Your progress</title>
</svelte:head>

<h1 class="text-ink text-2xl font-semibold">Your progress</h1>
<p class="text-ink-muted mt-1 text-sm">
  {#if hasHistory}
    <span class="tabular-nums">{data.stats.learned}</span>
    {data.stats.learned === 1 ? 'card' : 'cards'} learned so far.
  {:else}
    Every number here starts at zero — review your first card to begin filling this page in.
  {/if}
</p>

<div class="mt-6 grid grid-cols-2 gap-3">
  <div class="border-accent/30 bg-accent/5 rounded-xl border p-5">
    <p class="text-ink text-4xl font-semibold tabular-nums sm:text-5xl">{data.stats.streak}</p>
    <p class="text-ink mt-1 text-sm font-medium">Day streak</p>
    <p class="text-ink-muted text-xs">{streakNote}</p>
  </div>
  <div class="border-accent/30 bg-accent/5 rounded-xl border p-5">
    <p class="text-ink text-4xl font-semibold tabular-nums sm:text-5xl">{retentionLabel}</p>
    <p class="text-ink mt-1 text-sm font-medium">Retention</p>
    <p class="text-ink-muted text-xs">{retentionNote}</p>
  </div>
</div>

<div class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
  {#each secondaryTiles as tile (tile.label)}
    <div class="border-hairline bg-surface rounded-lg border p-4">
      <p class="text-ink text-xl font-semibold tabular-nums">{tile.value}</p>
      <p class="text-ink-muted text-xs">{tile.label}</p>
    </div>
  {/each}
</div>

<h2 class="text-ink mt-8 mb-1 text-lg font-medium">Review activity</h2>
<p class="text-ink-muted mb-3 text-sm">Every square is a day you showed up.</p>
<Heatmap days={data.stats.reviewsByDay} />

<div class="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
  <h2 class="text-ink text-lg font-medium">By chapter</h2>
  <p class="text-ink-muted flex items-center gap-3 text-xs">
    <span class="flex items-center gap-1.5">
      <span class="bg-accent h-2 w-2 rounded-full" aria-hidden="true"></span>Mature
    </span>
    <span class="flex items-center gap-1.5">
      <span class="bg-accent/40 h-2 w-2 rounded-full" aria-hidden="true"></span>Young
    </span>
    <span class="flex items-center gap-1.5">
      <span class="bg-hairline h-2 w-2 rounded-full" aria-hidden="true"></span>Not started
    </span>
  </p>
</div>
<div class="space-y-3">
  {#each chaptersWithMature as chapter (chapter.id)}
    <!-- Open the chapters you've actually touched: a collapsed disclosure hides
         the breakdown behind a click, and the untouched ones have nothing in
         them worth opening for. -->
    <details
      open={chapter.startedUnits.length > 0}
      class="group border-hairline bg-surface rounded-lg border"
    >
      <summary
        class="focus-visible:ring-accent flex cursor-pointer list-none flex-col gap-1.5 p-4 select-none focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden"
      >
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="text-ink flex min-w-0 items-center gap-1.5 font-medium">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="text-ink-muted h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span class="truncate">{chapter.title}</span>
          </span>
          <span class="text-ink-muted shrink-0 tabular-nums">
            {chapter.introduced}<span class="opacity-60">/{chapter.total}</span>
          </span>
        </div>
        <MasteryBar
          mature={chapter.matureCount}
          introduced={chapter.introduced}
          total={chapter.total}
          label={chapter.title}
        />
        <p class="text-ink-muted text-xs">
          <span class="tabular-nums">{chapter.matureCount}</span> mature
        </p>
      </summary>

      {#if chapter.startedUnits.length > 0}
        <ul class="border-hairline border-t">
          {#each chapter.startedUnits as unit (unit.id)}
            <li class="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span class="text-ink min-w-0 flex-1 truncate">{unit.title}</span>
              <span class="hidden w-28 shrink-0 sm:block">
                <MasteryBar
                  mature={unit.mature}
                  introduced={unit.introduced}
                  total={unit.total}
                  label={unit.title}
                />
              </span>
              <span class="text-ink-muted w-14 shrink-0 text-right tabular-nums">
                {unit.introduced}<span class="opacity-60">/{unit.total}</span>
              </span>
              <span class="text-ink-muted/70 w-20 shrink-0 text-right tabular-nums">
                {unit.mature} mature
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="border-hairline text-ink-muted border-t px-4 py-3 text-sm">
          No cards started in this chapter yet.
        </p>
      {/if}
    </details>
  {/each}
</div>
