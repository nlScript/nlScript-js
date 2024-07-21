import { ParsedNode } from "./ParsedNode.js";
import { DefaultParsedNode } from "./core/DefaultParsedNode.js";

export type Evaluator = (pn: ParsedNode) => any;

export module Evaluator {
    export const FIRST_CHILD_EVALUATOR = (pn: ParsedNode): any => pn.evaluate(0);

    export const ALL_CHILDREN_EVALUATOR = (pn: ParsedNode): any => {
        if(pn.getChildren().length === 0)
            return [];

        return pn.getChildren().map((p: DefaultParsedNode): any => p.evaluate());
    }

    export const DEFAULT_EVALUATOR = (pn: ParsedNode): any => pn.getParsedString();
}
