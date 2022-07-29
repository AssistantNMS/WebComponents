<svelte:options tag="assistant-nms-loading" />

<script lang="ts">
  import { NetworkState } from "../contracts/NetworkState";

  export let networkstate: NetworkState;
</script>

<div class="noselect">
  {#if networkstate == NetworkState.Loading}
    <slot name="loading" />
  {/if}
  {#if networkstate == NetworkState.Error}
    <slot name="error">error</slot>
  {/if}
  {#if networkstate == NetworkState.Success}
    <slot name="loaded">
      <div style="text-align: center">
        <span>Nothing supplied in the <b>loaded</b> slot</span>
      </div>
    </slot>
  {/if}
</div>

<style>
</style>
