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
        imageurl="/assets/images/error.png"
        name="Something went wrong"
      />
    </slot>
  {/if}
  {#if networkState == NetworkState.Success}
    <assistant-nms-common-tile
      imageurl="https://app.nmsassistant.com/assets/images/special/communityMissionProgress.png"
      name={`Research Progress - Tier ${communityMission.currentTier} / ${communityMission.totalTiers}`}
      url="https://app.nmsassistant.com/helloGames/communityMission"
    >
      <span slot="subtitle">Progress bar goes here</span>
    </assistant-nms-common-tile>
  {/if}
</div>

<style>
  .default-tile {
    --assistantnms-img-size: 100px;
  }
</style>
