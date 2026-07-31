<script lang="ts">
  import Heatmap from '$lib/components/Heatmap.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';

  let { data } = $props();

  const hasHistory = $derived(data.stats.learned > 0);

  const retentionLabel = $derived(
    data.stats.retention === null ? '—' : `${Math.round(data.stats.retention * 100)}%`
  );
  const retentionNote = $derived(
    data.stats.retention === null ? 'Not enough graduated reviews yet' : 'of reviews recalled, not marked Again'
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
      matureCount: chapter.units.reduce((sum, unit) => sum + unit.mature, 0)
    }))
  );
</script>

<svelte:head>
  <title>Your progress</title>
</svelte:head>

<h1 class="text-2xl font-semibold text-ink">Your progress</h1>
<p class="mt-1 text-sm text-ink-muted">
  {#if hasHistory}
    <span class="tabular-nums">{data.stats.learned}</span>
    {data.stats.learned === 1 ? 'card' : 'cards'} learned so far.
  {:else}
    Every number here starts at zero — review your first card to begin filling this page in.
  {/if}
</p>

<div class="mt-6 grid grid-cols-2 gap-3">
  <div class="rounded-xl border border-accent/30 bg-accent/5 p-5">
    <p class="text-4xl font-semibold tabular-nums text-ink sm:text-5xl">{data.stats.streak}</p>
    <p class="mt-1 text-sm font-medium text-ink">Day streak</p>
    <p class="text-xs text-ink-muted">{streakNote}</p>
  </div>
  <div class="rounded-xl border border-accent/30 bg-accent/5 p-5">
    <p class="text-4xl font-semibold tabular-nums text-ink sm:text-5xl">{retentionLabel}</p>
    <p class="mt-1 text-sm font-medium text-ink">Retention</p>
    <p class="text-xs text-ink-muted">{retentionNote}</p>
  </div>
</div>

<div class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
  {#each secondaryTiles as tile (tile.label)}
    <div class="rounded-lg border border-hairline bg-surface p-4">
      <p class="text-xl font-semibold tabular-nums text-ink">{tile.value}</p>
      <p class="text-xs text-ink-muted">{tile.label}</p>
    </div>
  {/each}
</div>

<h2 class="mt-8 mb-1 text-lg font-medium text-ink">Review activity</h2>
<p class="mb-3 text-sm text-ink-muted">Every square is a day you showed up.</p>
<Heatmap days={data.stats.reviewsByDay} />

<h2 class="mt-8 mb-3 text-lg font-medium text-ink">By chapter</h2>
<div class="space-y-4">
  {#each chaptersWithMature as chapter (chapter.id)}
    <div>
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium text-ink">{chapter.title}</span>
        <span class="tabular-nums text-ink-muted">
          {chapter.introduced}<span class="opacity-60">/{chapter.total}</span>
        </span>
      </div>
      <div class="mt-1.5"><ProgressBar value={chapter.introduced} total={chapter.total} /></div>
      <p class="mt-1 text-xs text-ink-muted">
        <span class="tabular-nums">{chapter.matureCount}</span> mature
      </p>
    </div>
  {/each}
</div>
