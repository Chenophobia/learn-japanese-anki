<script lang="ts">
  import type { UnitKind, CardFront, CardBack } from '$lib/cards';

  let { kind, front, back, revealed }: {
    kind: UnitKind;
    front: CardFront;
    back: CardBack;
    revealed: boolean;
  } = $props();
</script>

<div
  class="flex min-h-[16rem] flex-col items-center justify-center gap-6 rounded-2xl border border-hairline bg-surface p-6 text-center sm:min-h-[20rem] sm:p-10"
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

  {#if revealed}
    <hr class="w-16 border-hairline" />
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
  {/if}
</div>
