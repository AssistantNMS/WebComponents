export interface ItemInfoViewModel {
    appId: string;
    link: string;
    name: string;
    group: string;
    iconUrl: string;
    description: string;
    baseValueUnits: number;
    currencyType: string;
    maxStackSize: number;
    colour: string;
    usages: string[];
    blueprintCost: number;
    blueprintCostType: string;
    blueprintSource: string;
    requiredItems: RequiredItem[];
    consumableRewardTexts: string[];
}

export interface RequiredItem {
    appId: string;
    link: string;
    quantity: number;
}
