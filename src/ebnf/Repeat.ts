import { AstBuilder } from "../core/Production.js";
import { ParsedNode } from "../ParsedNode.js";
import { BNF } from "../core/BNF.js";
import { NonTerminal } from "../core/NonTerminal.js";
import { Sym } from "../core/Symbol.js";
import { Evaluator } from "../Evaluator.js";
import { Rule } from "./Rule.js";

export class Repeat extends Rule {
    private readonly from: number;
    private readonly to: number;

    constructor(tgt: NonTerminal | undefined, child: Sym, from: number, to: number) {
        super("repeat", tgt, child);
        this.from = from;
        this.to = to;
        this.setEvaluator(Evaluator.ALL_CHILDREN_EVALUATOR);
    }

    getFrom(): number {
        return this.from;
    }

    getTo(): number {
        return this.to;
    }

    getEntry(): Sym {
        return this.children[0];
    }

    override createBNF(grammar: BNF): void {
        for(let seqLen = this.to; seqLen >= this.from; seqLen--) {

            const rhs: Sym[] = [];
            for(let i = 0; i < seqLen; i++)
                rhs[i] = this.children[0];
            
            const p = Rule.addProduction(grammar, this, this.tgt, ...rhs);

            const that = this;
            p.onExtension((_parent, ...children) => {
                for(let c = 0; c < children.length; c++) {
                    let ch: ParsedNode = children[c] as ParsedNode;
                    ch.setNthEntryInParent(c);
                    ch.setName(that.getNameForChild(c));
                }
            });

            p.setAstBuilder(AstBuilder.DEFAULT);
        }
    }
}
