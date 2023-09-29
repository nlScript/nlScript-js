import { AstBuilder } from "../core/Production";
import { ParsedNode } from "../ParsedNode";
import { BNF } from "../core/BNF";
import { NonTerminal } from "../core/NonTerminal";
import { Sym } from "../core/Symbol";
import { Rule } from "./Rule";

export class Sequence extends Rule {
    constructor(tgt: NonTerminal | undefined, ...children: Sym[]) {
        super("sequence", tgt, ...children);
    }

    override createBNF(grammar: BNF): void {
        const p = Rule.addProduction(grammar, this, this.tgt, ...this.children);
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