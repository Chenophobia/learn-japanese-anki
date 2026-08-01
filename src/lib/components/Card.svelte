<script lang="ts">
  import type { UnitKind, CardFront, CardBack } from '$lib/cards';

  let { kind, front, back, revealed }: {
    kind: UnitKind;
    front: CardFront;
    back: CardBack;
    revealed: boolean;
  } = $props();
</script>

<!--
  Two faces of one card, stacked in a single grid cell so the container is
  sized to the taller of them. That is what keeps the flip from changing the
  page's height mid-rotation and shifting the rating bar under the user's
  thumb.

  Only the visible face is exposed: the turned-away one is `inert` and
  aria-hidden, so neither a screen reader nor the tab key reaches text the
  viewer cannot see. `backface-visibility` alone hides it visually but leaves
  it in the accessibility tree.

  Durations here are CSS, so app.css's prefers-reduced-motion block already
  collapses them — no JS involvement needed for the flip itself.
-->
<div class="[perspective:1200px]">
  <div
    class="grid transition-transform duration-300 ease-out [transform-style:preserve-3d]
      {revealed ? '[transform:rotateY(180deg)]' : ''}"
  >
    <div
      class="col-start-1 row-start-1 flex min-h-[16rem] flex-col items-center justify-center gap-6
        rounded-2xl border border-hairline bg-surface p-6 text-center [backface-visibility:hidden]
        [-webkit-backface-visibility:hidden] sm:min-h-[20rem] sm:p-10"
      inert={revealed}
      aria-hidden={revealed}
    >
      {#if kind === 'kana' || kind === 'kanji'}
        <div class="text-8xl leading-none text-ink sm:text-9xl">{(front as { char: string }).char}</div>
      {:else if kind === 'vocab'}
        <div class="max-w-full text-5xl leading-tight break-words text-ink sm:text-6xl">
          {(front as { word: string }).word}
        </div>
      {:else}
        <div class="max-w-md text-3xl leading-snug break-words text-ink sm:text-4xl">
          {(front as { pattern: string }).pattern}
        </div>
      {/if}
    </div>

    <div
      class="col-start-1 row-start-1 flex min-h-[16rem] flex-col items-center justify-center gap-6
        rounded-2xl border border-hairline bg-surface p-6 text-center [backface-visibility:hidden]
        [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] sm:min-h-[20rem] sm:p-10"
      inert={!revealed}
      aria-hidden={!revealed}
    >
      <div class="max-w-md space-y-2">
        {#if kind === 'kana'}
          <p class="text-2xl font-semibold text-ink">{(back as { romaji: string }).romaji}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { mnemonic: string }).mnemonic}</p>
        {:else if kind === 'kanji'}
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-lg text-ink-muted">{(back as { reading: string }).reading}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { example_word: string }).example_word}</p>
        {:else if kind === 'vocab'}
          <p class="text-lg text-ink-muted">{(back as { reading: string }).reading}</p>
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-sm break-words text-ink-muted">
            {(back as { example_sentence: string }).example_sentence}
          </p>
        {:else}
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { example: string }).example}</p>
        {/if}
      </div>
    </div>
  </div>
</div>
