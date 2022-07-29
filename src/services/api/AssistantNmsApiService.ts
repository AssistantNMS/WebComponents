import type { CommunityMissionViewModel } from '../../contracts/generated/communityMissionViewModel';
import type { ItemInfoViewModel } from '../../contracts/generated/itemInfoViewModel';
import type { ResultWithValue } from '../../contracts/results/ResultWithValue';
import { BaseApiService } from './BaseApiService';

declare global {
    interface Window { config: any }
}

export class AssistantNmsApiService extends BaseApiService {
    constructor() {
        super(window.config?.apiUrl ?? 'https://api.nmsassistant.com');
    }

    getItemInfoAppId = (appId: string, languageCode?: string): Promise<ResultWithValue<ItemInfoViewModel>> =>
        this.get<ItemInfoViewModel>(`ItemInfo/${appId}/${languageCode ?? 'en'}`);
    getItemInfoGameId = (gameId: string, languageCode?: string): Promise<ResultWithValue<ItemInfoViewModel>> =>
        this.get<ItemInfoViewModel>(`ItemInfo/GameId/${gameId}/${languageCode ?? 'en'}`);

    getCommunityMission = (): Promise<ResultWithValue<CommunityMissionViewModel>> =>
        this.get<CommunityMissionViewModel>('HelloGames/CommunityMission/');
}
