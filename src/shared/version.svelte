<svelte:options tag="assistant-nms-version-tile" />

<script lang="ts">
  import { currentVersion } from "../version";
  let versionName = currentVersion;
</script>

<span>{versionName}</span>

<style>
  * {
    font-family: var(
      --assistantnms-font-family,
      "Roboto",
      Helvetica,
      Arial,
      sans-serif
    );
    font-weight: var(--assistantnms-font-weight, "bold");
  }
</style>
