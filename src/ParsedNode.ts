import { Autocompletion } from "./core/Autocompletion.js";
import { DefaultParsedNode } from "./core/DefaultParsedNode.js";
import { Matcher } from "./core/Matcher.js";
import { ParsingState } from "./core/ParsingState.js";
import { Production } from "./core/Production.js";
import { Sym } from "./core/Symbol.js";
import { EBNFProduction } from "./ebnf/EBNFProduction.js";
import { ParseListener } from "./ebnf/ParseListener.js";
import { Rule } from "./ebnf/Rule.js";

class ParsedNode extends DefaultParsedNode {
    
    private nthEntryInParent: number = 0;

    constructor(matcher: Matcher, symbol: Sym, production: Production) {
        super(matcher, symbol, production);
    }

    setNthEntryInParent(nthEntry: number): void {
        this.nthEntryInParent = nthEntry;
    }

    getNthEntryInParent(): number {
        return this.nthEntryInParent;
    }

    getRule(): Rule | undefined {
        let production: Production | undefined = this.getProduction();
        if(production !== undefined && production instanceof EBNFProduction)
            return (production as EBNFProduction).getRule();
        return undefined;
    }

    private parentHasSameRule(): boolean {
        let thisRule: Rule | undefined = this.getRule();
        if(thisRule === undefined)
            return false;
        
        let parent: DefaultParsedNode | undefined = this.getParent();
        if(parent === undefined)
            return false;
        
        let parentRule: Rule | undefined = (parent as ParsedNode).getRule();
        if(parentRule === undefined)
            return false;
        
        return thisRule === parentRule;
    }

    getAutocompletion(justCheck: boolean): Autocompletion[] | undefined {
        let rule: Rule | undefined = this.getRule();
        if(rule !== undefined && rule.getAutocompleter() !== undefined && !this.parentHasSameRule()) {
            return rule.getAutocompleter()?.getAutocompletion(this, justCheck);
        }
        return super.getAutocompletion(justCheck);
    }

    notifyListeners(): void {
        for(let i = 0; i < this.numChildren(); i++)
            (this.getChild(i) as ParsedNode).notifyListeners();

        const state: ParsingState = this.getMatcher().state;
        if(!state.equals(ParsingState.SUCCESSFUL) && !state.equals(ParsingState.END_OF_INPUT))
            return;

        let rule: Rule | undefined = this.getRule();
        if(rule !== undefined && !this.parentHasSameRule()) {
            let parseListener: ParseListener | undefined = rule.getOnSuccessfulParsed();
            if(parseListener !== undefined)
                parseListener(this);
        }
    }

    override evaluate(...n: any): any {
        if(n.length > 0)
            return super.evaluate(...n);

        let rule: Rule | undefined = this.getRule();
        if(rule !== undefined && rule.getEvaluator() !== undefined)
            return rule.getEvaluator().evaluate(this);
        
        return super.evaluate();
    }
}

export { ParsedNode };
