<svelte:options tag="assistant-nms-current-expedition-tile" />

<script lang="ts">
  import { onMount } from "svelte";
  import { NetworkState } from "../../contracts/NetworkState";
  import { AssistantNmsApiService } from "../../services/api/AssistantNmsApiService";
  import { anyObject } from "../../helper/typescriptHacks";
  import type { CurrentExpeditionViewModel } from "../../contracts/generated/currentExpeditionViewModel";
  import {
    getRelativeTimeLeft,
    percentageProgress,
  } from "../../helper/dateHelper";

  let networkState: NetworkState = NetworkState.Loading;
  let currentExpedition: CurrentExpeditionViewModel = anyObject;
  let percentage: number = 0;
  let relativeTimeLeft: string = "";

  const fetchCurrentExpedition = async () => {
    const anmsApi = new AssistantNmsApiService();
    let currentExpResult = await anmsApi.getCurrentExpedition();

    if (currentExpResult.isSuccess == false || currentExpResult.value == null) {
      networkState = NetworkState.Error;
      return;
    }

    currentExpedition = { ...currentExpResult.value };
    networkState = NetworkState.Success;
    percentage = percentageProgress(
      currentExpedition.startDate,
      currentExpedition.endDate
    );
    relativeTimeLeft = getRelativeTimeLeft(
      currentExpedition.startDate,
      currentExpedition.endDate
    );
  };

  onMount(async () => {
    fetchCurrentExpedition();
  });
</script>

<div class="default-tile noselect">
  {#if networkState == NetworkState.Loading}
    <slot name="loading">
      <assistant-nms-tile-loading />
    </slot>
  {/if}
  {#if networkState == NetworkState.Error}
    <slot name="error">
      <assistant-nms-common-tile
        imageurl="https://app.nmsassistant.com/assets/images/error.png"
        name="Something went wrong"
      />
    </slot>
  {/if}
  {#if networkState == NetworkState.Success}
    <assistant-nms-common-tile
      imageurl={currentExpedition.imageUrl}
      name={currentExpedition.name}
      nametextalign="center"
      url="https://app.nmsassistant.com/helloGames/seasonExpedition"
      showsubtitle={true}
    >
      <div slot="subtitle" class="progressbar">
        <div class="progress" style={`width: ${percentage}%;`} />
        <span>{percentage}%&nbsp;-&nbsp;{relativeTimeLeft}</span>
      </div>
    </assistant-nms-common-tile>
  {/if}
</div>

<style>
  .default-tile {
    --assistantnms-img-size: 75px;
  }
  .progressbar {
    position: relative;
    background: #000;
    width: 100%;
    min-width: 250px;
    height: 20px;
    border-radius: 5px;
  }

  .progressbar span {
    position: absolute;
    top: 0;
    left: 50%;
    font-size: 16px;
    font-weight: bold;
    transform: translateX(-50%);
    mix-blend-mode: difference;
  }

  .progress {
    height: 20px;
    border-radius: 5px;
    background: var(--assistantnms-progress-bar-end-colour, #e0c83f);
    background: linear-gradient(
      to right,
      var(--assistantnms-progress-bar-start-colour, #f47c34),
      var(--assistantnms-progress-bar-end-colour, #e0c83f)
    );
    transition: 600ms cubic-bezier(0.6, 0, 0.38, 1);
  }
</style>
