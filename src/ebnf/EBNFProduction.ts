import { NonTerminal } from "../core/NonTerminal.js";
import { Production } from "../core/Production.js";
import { Sym } from "../core/Symbol.js";
import { Rule } from "./Rule.js";

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
