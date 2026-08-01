<script lang="ts">
  let { value, total }: { value: number; total: number } = $props();
  let percent = $derived(total === 0 ? 0 : Math.round((value / total) * 100));
</script>

<div
  class="h-1.5 w-full overflow-hidden rounded-full bg-hairline"
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={total}
>
  <div
    class="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
    style="width: {percent}%"
  ></div>
</div>
