import { ParsedNode } from "../ParsedNode";
import { BNF } from "../core/BNF";
import { NonTerminal } from "../core/NonTerminal";
import { Sym } from "../core/Symbol";
import { Evaluator } from "../Evaluator";
import { Rule } from "./Rule";


export class Star extends Rule {
    constructor(tgt: NonTerminal | undefined, child: Sym) {
        super("star", tgt, child);
        this.setEvaluator(Evaluator.ALL_CHILDREN_EVALUATOR);
    }

    getEntry(): Sym {
        return this.children[0];
    }

    override createBNF(grammar: BNF): void {
        const p1 = Rule.addProduction(grammar, this, this.tgt, this.children[0], this.tgt);
        Rule.addProduction(grammar, this, this.tgt);

        const that = this;

        p1.onExtension((parent, ...children) => {
            let nthEntry = (parent as ParsedNode).getNthEntryInParent();
            let c0: ParsedNode = children[0] as ParsedNode;
            let c1: ParsedNode = children[1] as ParsedNode;

            c0.setNthEntryInParent(nthEntry);
            c0.setName(that.getNameForChild(nthEntry));

            c1.setNthEntryInParent(nthEntry + 1);
            c1.setName(parent.getName());
        });

        p1.setAstBuilder((parent, ...children) => {
            parent.addChildren(children[0]);
            parent.addChildren(...children[1].getChildren());
        });
    }
}