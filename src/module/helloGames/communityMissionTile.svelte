<svelte:options tag="assistant-nms-community-mission-tile" />

<script lang="ts">
  import { onMount } from "svelte";
  import { NetworkState } from "../../contracts/NetworkState";
  import { AssistantNmsApiService } from "../../services/api/AssistantNmsApiService";
  import { anyObject } from "../../helper/typescriptHacks";
  import type { CommunityMissionViewModel } from "../../contracts/generated/communityMissionViewModel";

  let networkState: NetworkState = NetworkState.Loading;
  let communityMission: CommunityMissionViewModel = anyObject;

  const fetchCommunityMission = async () => {
    const anmsApi = new AssistantNmsApiService();
    let commMissionResult = await anmsApi.getCommunityMission();

    if (
      commMissionResult.isSuccess == false ||
      commMissionResult.value == null
    ) {
      networkState = NetworkState.Error;
      return;
    }

    communityMission = { ...commMissionResult.value };
    networkState = NetworkState.Success;
  };

  onMount(async () => {
    fetchCommunityMission();
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
      imageurl="https://app.nmsassistant.com/assets/images/special/communityMissionProgress.png"
      name={`Research Progress - Tier ${communityMission.currentTier} / ${communityMission.totalTiers}`}
      url="https://app.nmsassistant.com/helloGames/communityMission"
      showsubtitle={true}
    >
      <div slot="subtitle" class="progressbar">
        <div
          class="progress"
          style={`width: ${communityMission.percentage}%;`}
        />
        <span>{`${communityMission.percentage}%`}</span>
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
    height: 20px;
    border-radius: 5px;
  }

  .progressbar span {
    position: absolute;
    top: 0;
    left: 50%;
    font-size: 16px;
    transform: translateX(-50%);
    mix-blend-mode: difference;
  }

  .progress {
    height: 20px;
    border-radius: 5px;
    background: #e0c83f;
    background: linear-gradient(to right, #f47c34, #e0c83f);
    transition: 600ms cubic-bezier(0.6, 0, 0.38, 1);
  }
</style>
