<svelte:options tag="assistant-nms-common-tile" />

<script lang="ts">
  export let imageurl: string = "";
  export let name: string = "";
  export let bgcolour: string = "2c7c9f";
  export let url: string = "https://nmsassistant.com";
  export let showsubtitle: boolean = false;
</script>

<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  class="gen-item-container noselect"
>
  <div class="image-container" style={`background-color: #${bgcolour};`}>
    <img src={imageurl} alt="loading" draggable={false} />
  </div>
  <div class="gen-item-content-container">
    <div class="text-container" class:full={showsubtitle == false}>
      <p class="single-line">{name}</p>
    </div>
    {#if showsubtitle}
      <div class="quantity-container single-line">
        <slot name="subtitle" />
      </div>
    {/if}
  </div>
</a>

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

  .noselect {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .gen-item-container {
    display: inline-flex;
    padding-right: 1em;
    width: var(--assistantnms-tile-width, unset);
    max-width: 100%;
    border-radius: 0.5em var(--assistantnms-border-radius, 0.5em)
      var(--assistantnms-border-radius, 0.5em) 0.5em;
    color: var(--assistantnms-tile-fg-colour, #c5c5c5);
    background-color: var(--assistantnms-tile-bg-colour, #303030);
    text-decoration: none;
  }

  .image-container {
    height: var(--assistantnms-img-size, 100px);
    width: var(--assistantnms-img-size, 100px);
    display: inline-block;
    position: relative;
    border-top-left-radius: var(--assistantnms-border-radius, 0.25em);
    border-bottom-left-radius: var(--assistantnms-border-radius, 0.25em);
  }

  .image-container img {
    max-height: var(--assistantnms-img-size, 100px);
    width: var(--assistantnms-img-size, 100px);
    border-top-left-radius: var(--assistantnms-border-radius, 0.25em);
    border-bottom-left-radius: var(--assistantnms-border-radius, 0.25em);
  }

  .gen-item-content-container {
    flex-grow: 1;
    max-height: var(--assistantnms-img-size, 100px);
    position: relative;
    overflow: hidden;
  }

  .gen-item-content-container p {
    margin: 0;
  }

  .single-line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gen-item-content-container .text-container {
    font-size: var(--assistantnms-name-font-size, 1.2em);
    text-align: left;
    padding-top: 0.6em;
    padding-left: 1rem;
    padding-right: 0.25rem;
  }

  .gen-item-content-container .text-container.full {
    padding-top: 0;
  }

  .gen-item-content-container .text-container.full p {
    line-height: var(--assistantnms-img-size, 100px);
  }

  .gen-item-content-container .quantity-container {
    padding-left: 1.05rem;
    padding-right: 0.21rem;
    max-width: 100%;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
