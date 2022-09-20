<svelte:options tag="assistant-nms-nmsfm-tile" />

<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ZenoFMApiService } from "../../services/api/ZenoFMApiService";

  let artist: string = "";
  let trackName: string = "";

  const fetchTrackDetails = async () => {
    const zenoApi = new ZenoFMApiService();
    let nowPlayingResult = await zenoApi.getNowPlaying();

    if (nowPlayingResult.isSuccess && nowPlayingResult.value != null) {
      artist = nowPlayingResult.value.artist;
      trackName = nowPlayingResult.value.title;
    }
  };

  const interval = setInterval(fetchTrackDetails, 10000);

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="noselect">
  <div class="nmsfm-container">
    <img
      src="https://app.nmsassistant.com/assets/images/special/nmsfmDrawer.png"
      class="nmsfm-img"
      class:small={artist.length < 1 && trackName.length < 1}
      alt="nmsfm logo"
    />
    <div class="nmsfm-content">
      {#if artist.length > 0}
        <h3>{artist}</h3>
      {/if}
      {#if trackName.length > 0}
        <p>{trackName}</p>
      {/if}
      <audio controls class="nmsfm-audio">
        <source
          src="https://stream.zenolive.com/9kz76c8mdg8uv.aac"
          type="audio/ogg"
        />
        Your browser does not support the audio element.
      </audio>
    </div>
  </div>
</div>

<style>
  .nmsfm-container {
    display: inline-flex;
    flex-direction: row;
    padding-right: 1em;
    width: var(--assistantnms-tile-width, unset);
    max-width: 100%;
    border-radius: 0.5em var(--assistantnms-border-radius, 0.5em)
      var(--assistantnms-border-radius, 0.5em) 0.5em;
    color: var(--assistantnms-tile-fg-colour, #c5c5c5);
    background-color: var(--assistantnms-tile-bg-colour, #303030);
    text-decoration: none;
  }

  .nmsfm-img {
    border-top-left-radius: var(--assistantnms-border-radius, 0.25em);
    border-bottom-left-radius: var(--assistantnms-border-radius, 0.25em);
    max-height: 100%;
  }

  .nmsfm-img.small {
    max-height: 5em;
  }

  .nmsfm-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 1em;
    overflow: hidden;
  }

  .nmsfm-content h3,
  .nmsfm-content p {
    margin: 0;
    padding: 0;
  }

  .nmsfm-content p {
    padding-bottom: 0.5em;
  }

  .nmsfm-audio {
    border-radius: var(--assistantnms-border-radius, 0.25em);
    background-color: #f1f3f4;
  }
</style>
