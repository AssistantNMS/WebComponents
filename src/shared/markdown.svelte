<svelte:options tag="assistant-nms-markdown" />

<script lang="ts">
  import { marked } from "marked";
  let _marked = marked;

  export let source: string = "";
</script>

<div class="markdown">
  {@html _marked(source)}
</div>

<style>
</style>
