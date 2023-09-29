import { ParsedNode } from "./ParsedNode";

export type Evaluator = (pn: ParsedNode) => any;

export module Evaluator {
    export const FIRST_CHILD_EVALUATOR = (pn: ParsedNode): any => pn.evaluate(0);

    export const ALL_CHILDREN_EVALUATOR = (pn: ParsedNode): any => {
            let ret: any[] = [];
            for(let i = 0; i < pn.numChildren(); i++) {
                ret[i] = pn.evaluate(i);
            }
            return ret;
        };
    
    export const DEFAULT_EVALUATOR = (pn: ParsedNode): any => pn.getParsedString();
}
