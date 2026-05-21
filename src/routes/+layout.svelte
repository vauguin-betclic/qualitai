<script lang="ts">
  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: #0f1115;
    color: #e6e8eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px;
  }
</style>
