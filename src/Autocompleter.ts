import { ParsedNode } from "./ParsedNode.js";
import { DefaultParsedNode } from "./core/DefaultParsedNode.js";
import { Autocompletion } from "./core/Autocompletion.js";
import { BNF } from "./core/BNF.js";
import { Lexer } from "./core/Lexer.js";
import { Production } from "./core/Production.js";
import { RDParser } from "./core/RDParser.js";
import { Sym } from "./core/Symbol.js";
import { EBNFCore } from "./ebnf/EBNFCore.js";
import { EBNFParsedNodeFactory } from "./ebnf/EBNFParsedNodeFactory.js";
import { Rule } from "./ebnf/Rule.js";
import { Sequence } from "./ebnf/Sequence.js";

interface Autocompleter {
    getAutocompletion(n: DefaultParsedNode, justCheck: boolean): Autocompletion[] | undefined;
}

class IfNothingYetEnteredAutocompleter implements Autocompleter {
    private readonly ifNothingYetEntered: string;
    private readonly otherwise: string | undefined;

    constructor(ifNothingYetEntered: string, otherwise: string | undefined) {
        this.ifNothingYetEntered = ifNothingYetEntered;
        this.otherwise = otherwise;
    }

    getAutocompletion(pn: DefaultParsedNode, _justCheck: boolean): Autocompletion[] | undefined {
        if(pn.getParsedString().length === 0)
            return Autocompletion.literal(pn, [this.ifNothingYetEntered]);

        if(this.otherwise !== undefined)
            return Autocompletion.literal(pn, [this.otherwise]);

        return undefined;
    }
}

class EntireSequenceCompleter implements Autocompleter {

    private readonly ebnf: EBNFCore;

    private readonly symbol2Autocompletion: Map<string, Autocompletion[]>;

    constructor(ebnf: EBNFCore, symbol2Autocompletion: Map<string, Autocompletion[]>) {
        this.ebnf = ebnf;
        this.symbol2Autocompletion = symbol2Autocompletion;
    }

    getAutocompletion(pn: DefaultParsedNode, _justCheck: boolean): Autocompletion[] | undefined {
        const alreadyEntered: string = pn.getParsedString();

        const sequence: Rule = (pn as ParsedNode).getRule() as Rule;
        const children: Sym[] = sequence.getChildren();

        const entireSequenceCompletion = new Autocompletion.EntireSequence(pn);

        for(let i = 0; i < children.length; i++) {
            let key = children[i].getSymbol() + ":" + sequence.getNameForChild(i);
            let autocompletionsForChild: Autocompletion[] | undefined = this.symbol2Autocompletion.get(key);
            if(autocompletionsForChild !== undefined) {
                entireSequenceCompletion.add(autocompletionsForChild);
                continue;
            }
            const bnf: BNF = new BNF(this.ebnf.getBNF());

            const newSequence: Sequence = new Sequence(undefined, children[i]);
            newSequence.setParsedChildNames(sequence.getNameForChild(i));
            newSequence.createBNF(bnf);

            bnf.removeStartProduction();
            bnf.addProduction(new Production(BNF.ARTIFICIAL_START_SYMBOL, newSequence.getTarget()));
            const parser: RDParser = new RDParser(bnf, new Lexer(""), EBNFParsedNodeFactory.INSTANCE);

            autocompletionsForChild = [];
            parser.parse(autocompletionsForChild);

            this.symbol2Autocompletion.set(key, autocompletionsForChild);
            entireSequenceCompletion.add(autocompletionsForChild);
        }
        // avoid to call getCompletion() more often than necessary
        if(alreadyEntered.length === 0)
            return entireSequenceCompletion.asArray();

        const idx: number = entireSequenceCompletion.getCompletion(Autocompletion.Purpose.FOR_INSERTION).indexOf("${");
 			
        if(idx !== undefined && idx >= 0 && alreadyEntered.length > idx)
            return undefined;
        return entireSequenceCompletion.asArray();
    }
}

module Autocompleter {
    export const DEFAULT_INLINE_AUTOCOMPLETER: Autocompleter = {
        getAutocompletion(pn: ParsedNode, _justCheck: boolean): Autocompletion[] | undefined {
            let alreadyEntered = pn.getParsedString();
            if(alreadyEntered.length > 0)
                return Autocompletion.veto(pn);
            let name = pn.getName();
            if(name === undefined)
                name = pn.getSymbol().getSymbol();
            if(name === undefined)
                return undefined;
            return Autocompletion.parameterized(pn, name);
        }
    }
};

export { Autocompleter, EntireSequenceCompleter, IfNothingYetEnteredAutocompleter };
