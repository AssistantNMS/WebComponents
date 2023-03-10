import type { ResultWithValue } from '../../contracts/results/ResultWithValue';
import { BaseApiService } from './BaseApiService';

declare global {
    interface Window { config: any }
}

export interface NowPlayingResponse {
    duration: number;
    thumb: string;
    artist: string;
    buy_urls: string;
    album: string;
    guid: string;
    sku: string;
    title: string;
    info_urls: string;
}


export class ZenoFMApiService extends BaseApiService {
    constructor() {
        super('https://zenoplay.zenomedia.com/api');
    }

    getNowPlaying = (): Promise<ResultWithValue<NowPlayingResponse>> =>
        this.get<NowPlayingResponse>(`zenofm/nowplaying/9kz76c8mdg8uv`);
}
