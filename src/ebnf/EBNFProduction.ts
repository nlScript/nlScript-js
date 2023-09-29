import { NonTerminal } from "../core/NonTerminal";
import { Production } from "../core/Production";
import { Sym } from "../core/Symbol";
import { Rule } from "./Rule";

class EBNFProduction extends Production {
    
    private readonly rule: Rule;

    constructor(rule: Rule, left: NonTerminal, ...right: Sym[]) {
        super(left, ...right);
        this.rule = rule;
    }

    getRule(): Rule {
        return this.rule;
    }
}

export { EBNFProduction };
