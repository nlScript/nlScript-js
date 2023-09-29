import { ParsedNode } from "../ParsedNode";
import { BNF } from "../core/BNF";
import { NonTerminal } from "../core/NonTerminal";
import { Sym } from "../core/Symbol";
import { Evaluator } from "../Evaluator";
import { Rule } from "./Rule";
import { AstBuilder } from "../core/Production";

export class Optional extends Rule {
    constructor(tgt: NonTerminal | undefined, child: Sym) {
        super("optional", tgt, child);
        this.setEvaluator(Evaluator.ALL_CHILDREN_EVALUATOR);
    }

    getEntry(): Sym {
        return this.children[0];
    }

    override createBNF(grammar: BNF): void {
        const p1 = Rule.addProduction(grammar, this, this.tgt, this.children[0]);
        Rule.addProduction(grammar, this, this.tgt);

        const that = this;

        p1.onExtension((_parent, ...children) => {
            let c0: ParsedNode = children[0] as ParsedNode;
            c0.setNthEntryInParent(0);
            c0.setName(that.getNameForChild(0));
        });

        p1.setAstBuilder(AstBuilder.DEFAULT);
    }
}
