<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { motionDuration, prefersReducedMotion } from '$lib/motion';

  let { value }: { value: number } = $props();

  const tween = new Tween(value, {
    duration: motionDuration(500, prefersReducedMotion()),
    easing: cubicOut
  });

  $effect(() => {
    tween.set(value);
  });

  // Rounded, never truncated: the tween's intermediate values are
  // fractional, but this is a count of cards and must land on exactly the
  // number the server sent. Math.round of a settled tween is that number.
  const shown = $derived(Math.round(tween.current));
</script>

<span class="tabular-nums">{shown}</span>
