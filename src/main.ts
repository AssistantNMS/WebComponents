import { currentVersion } from './version';

export * from './module/helloGames/communityMissionTile.svelte';
export * from './module/item/itemInfoTile.svelte';
export * from './shared/commonTile.svelte';
export * from './shared/loadingWithSlots.svelte';
export * from './shared/markdown.svelte';
export * from './shared/tileLoading.svelte';
export * from './shared/tooltip.svelte';

export * from './App.svelte';

console.log(`AssistantNMS.WebComponents v${currentVersion}`)