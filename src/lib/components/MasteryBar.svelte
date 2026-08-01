<script lang="ts">
  // Splits a unit or chapter into mature / young / not-yet-introduced. The
  // chapter map's ProgressBar answers "how far in am I"; this answers "how
  // much of what I've seen has actually stuck", which is the question the
  // stats page exists to ask.
  let {
    mature,
    introduced,
    total,
    label
  }: { mature: number; introduced: number; total: number; label: string } = $props();

  const young = $derived(Math.max(0, introduced - mature));
  const pct = $derived((n: number) => (total === 0 ? 0 : (n / total) * 100));
</script>

<div
  class="bg-hairline flex h-1.5 w-full overflow-hidden rounded-full"
  role="img"
  aria-label="{label}: {mature} mature, {young} young, {Math.max(
    0,
    total - introduced
  )} not started, of {total} cards"
>
  <div class="bg-accent h-full" style="width: {pct(mature)}%"></div>
  <div class="bg-accent/40 h-full" style="width: {pct(young)}%"></div>
</div>
