import { ParsedNode } from "./ParsedNode.js";
import { DefaultParsedNode } from "./core/DefaultParsedNode.js";

export type EvaluateFunction = (pn: ParsedNode) => any;

export interface Evaluator {
    evaluate(n: ParsedNode): any;
}

export module Evaluator {
    export const FIRST_CHILD_EVALUATOR: Evaluator = {
        evaluate: (pn: ParsedNode): any => pn.evaluate(0)
    };

    export const ALL_CHILDREN_EVALUATOR: Evaluator = {
        evaluate: (pn: ParsedNode): any => {
            if(pn.getChildren().length === 0)
                return [];
            return pn.getChildren().map((p: DefaultParsedNode): any => p.evaluate());
        }
    };

    export const DEFAULT_EVALUATOR: Evaluator = {
        evaluate: (pn: ParsedNode): any => pn.getParsedString()
    };
}
