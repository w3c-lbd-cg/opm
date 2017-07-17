export interface ICalc {
    args: IArgs[];
    unit: string;
    calc: string;
    property: string;
    evaluationURI?: string;
    propertyURI?: string;
    graphURI?: string;
    hostURI?: string;
}

export interface IArgs {
    property: string;
    targetPath?: string;
}