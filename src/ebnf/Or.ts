import { AstBuilder } from "../core/Production";
import { ParsedNode } from "../ParsedNode";
import { BNF } from "../core/BNF";
import { NonTerminal } from "../core/NonTerminal";
import { Sym } from "../core/Symbol";
import { Evaluator } from "../Evaluator";
import { Rule } from "./Rule";

export class Or extends Rule {
    constructor(tgt: NonTerminal | undefined, ...children: Sym[]) {
        super("or", tgt, ...children);
        this.setEvaluator(Evaluator.FIRST_CHILD_EVALUATOR);
    }

    override createBNF(grammar: BNF): void {
        for(let io = 0; io < this.children.length; io++) {
            const fio = io;
            const option = this.children[io];
            const p = Rule.addProduction(grammar, this, this.tgt, option);

            const that = this;
            
            p.onExtension((_parent, ...children) => {
                let c0: ParsedNode = children[0] as ParsedNode;
                c0.setNthEntryInParent(fio);
                c0.setName(that.getNameForChild(fio));
            });
    
            p.setAstBuilder(AstBuilder.DEFAULT);
        }
    }
}