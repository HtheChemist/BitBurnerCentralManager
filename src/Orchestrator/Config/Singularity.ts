interface BuyAction {
    moneyRequired: number;
    functionName: string;
}

const BUY_REQUIREMENT: BuyAction[] = [
    {moneyRequired: 200000, functionName: "buyTor"},
]