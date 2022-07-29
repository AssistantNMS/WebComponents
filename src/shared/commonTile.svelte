<svelte:options tag="assistant-nms-common-tile" />

<script lang="ts">
  export let imageurl: string = "";
  export let name: string = "";
  export let bgcolour: string = "2c7c9f";
  export let url: string = "https://nmsassistant.com";
</script>

<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  class="gen-item-container"
>
  <div class="image-container">
    <img
      src={imageurl}
      alt="loading"
      draggable={false}
      style={`background-color: #${bgcolour};`}
    />
  </div>
  <div class="gen-item-content-container">
    {#if $$slots.subtitle}
      <div class="text-container full">
        <p>{name}</p>
        <div class="quantity-container">
          <slot name="subtitle" />
        </div>
      </div>
    {:else}
      <div class="text-container full">
        <p>{name}</p>
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

  .gen-item-container {
    display: inline-flex;
    padding-right: 1em;
    width: var(--assistantnms-tile-width, unset);
    border-radius: 0.5em var(--assistantnms-border-radius, 0.25em)
      var(--assistantnms-border-radius, 0.25em) 0.5em;
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
    min-width: 100%;
    position: relative;
    overflow: hidden;
  }

  .gen-item-content-container p {
    margin: 0;
  }

  .gen-item-content-container .text-container {
    font-size: var(--assistantnms-name-font-size, 1.2em);
    text-align: left;
    padding-top: 0.6em;
    padding-left: 1rem;
    padding-right: 0.5rem;
  }

  .gen-item-content-container .text-container.full {
    padding-top: 0;
  }

  .gen-item-content-container .text-container.full p {
    line-height: var(--assistantnms-img-size, 100px);
  }

  .gen-item-content-container .quantity-container {
    overflow: hidden;
    padding-left: 1.05rem;
    padding-right: 1rem;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
