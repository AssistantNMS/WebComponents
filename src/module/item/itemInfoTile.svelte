<svelte:options tag="assistant-nms-item-info-tile" />

<script lang="ts">
  import { onMount } from "svelte";
  import { NetworkState } from "../../contracts/NetworkState";
  import { AssistantNmsApiService } from "../../services/api/AssistantNmsApiService";
  import type { ItemInfoViewModel } from "../../contracts/generated/itemInfoViewModel";
  import { anyObject } from "../../helper/typescriptHacks";
  import type { ResultWithValue } from "../../contracts/results/ResultWithValue";

  let networkState: NetworkState = NetworkState.Loading;
  let itemInfo: ItemInfoViewModel = anyObject;

  export let appid: string = "";
  export let gameid: string = "";
  export let langcode: string = "en";

  const fetchAppDetails = async () => {
    const anmsApi = new AssistantNmsApiService();
    let itemInfoResult: ResultWithValue<ItemInfoViewModel> = {
      isSuccess: false,
      value: anyObject,
      errorMessage: "not initialised",
    };
    if (appid != null && appid.length > 3) {
      itemInfoResult = await anmsApi.getItemInfoAppId(appid, langcode);
    } else if (gameid != null && gameid.length > 3) {
      itemInfoResult = await anmsApi.getItemInfoGameId(gameid, langcode);
    }

    if (itemInfoResult.isSuccess == false || itemInfoResult.value == null) {
      networkState = NetworkState.Error;
      return;
    }

    itemInfo = { ...itemInfoResult.value };
    networkState = NetworkState.Success;
  };

  onMount(async () => {
    fetchAppDetails();
  });
</script>

<div class="noselect">
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
    <assistant-nms-tooltip tooltiptext={itemInfo.description}>
      <assistant-nms-common-tile
        imageurl={itemInfo.iconUrl}
        bgcolour={itemInfo.colour}
        name={itemInfo.name}
        url={itemInfo.link}
      />
    </assistant-nms-tooltip>
  {/if}
</div>

<style>
</style>
