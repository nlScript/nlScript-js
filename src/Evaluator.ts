import { ParsedNode } from "./ParsedNode";
import { DefaultParsedNode } from "./core";

export type Evaluator = (pn: ParsedNode) => any;

export module Evaluator {
    export const FIRST_CHILD_EVALUATOR = (pn: ParsedNode): any => pn.evaluate(0);

    export const ALL_CHILDREN_EVALUATOR = (pn: ParsedNode): any => {
        if(pn.getChildren().length === 0)
            return [];

        let ret: any[] = pn.getChildren().map((p: DefaultParsedNode): any => p.evaluate());

        let allAreCharacters: boolean = ret.every((p: any): boolean => typeof(p) === 'string' && p.length === 1);

        if(!allAreCharacters)
            return ret;

        return ret.join("");

        // let ret: any[] = [];
        // for(let i = 0; i < pn.numChildren(); i++) {
        //     ret[i] = pn.evaluate(i);
        // }
        // return ret;
    }

    export const DEFAULT_EVALUATOR = (pn: ParsedNode): any => pn.getParsedString();
}
