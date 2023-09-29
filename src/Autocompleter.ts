import { ParsedNode } from "./ParsedNode";
import { Autocompletion } from "./core/Autocompletion";
import { BNF } from "./core/BNF";
import { Lexer } from "./core/Lexer";
import { Production } from "./core/Production";
import { RDParser } from "./core/RDParser";
import { Sym } from "./core/Symbol";
import { EBNFCore } from "./ebnf/EBNFCore";
import { EBNFParsedNodeFactory } from "./ebnf/EBNFParsedNodeFactory";
import { Rule } from "./ebnf/Rule";
import { Sequence } from "./ebnf/Sequence";

interface Autocompleter {
    getAutocompletion(n: ParsedNode): string | undefined;
}

class IfNothingYetEnteredAutocompleter implements Autocompleter {
    private readonly completion: string;

    constructor(completion: string) {
        this.completion = completion;
    }

    getAutocompletion(pn: ParsedNode) : string {
        return pn.getParsedString().length == 0 ? this.completion : "";
    }
}

class EntireSequenceCompleter implements Autocompleter {
    
    private readonly ebnf: EBNFCore;

    private readonly symbol2Autocompletion: Map<String, String>;

    constructor(ebnf: EBNFCore, symbol2Autocompletion: Map<String, String>) {
        this.ebnf = ebnf;
        this.symbol2Autocompletion = symbol2Autocompletion;
    }

    getAutocompletion(pn: ParsedNode): string | undefined {
        const alreadyEntered: string = pn.getParsedString();
        if(alreadyEntered.length > 0)
            return undefined;
        
        let autocompletionString: string = "";

        const sequence: Rule = pn.getRule() as Rule;
        const children: Sym[] = sequence.getChildren();

        for(let i = 0; i < children.length; i++) {
            let key = children[i].getSymbol() + ":" + sequence.getNameForChild(i);
            let autocompletionStringForChild = this.symbol2Autocompletion.get(key);
            if(autocompletionStringForChild !== undefined) {
                autocompletionString += autocompletionStringForChild;
                continue;
            }
            const bnf: BNF = new BNF(this.ebnf.getBNF());

            const newSequence: Sequence = new Sequence(undefined, children[i]);
            newSequence.setParsedChildNames(sequence.getNameForChild(i));
            newSequence.createBNF(bnf);

            bnf.removeStartProduction();
            bnf.addProduction(new Production(BNF.ARTIFICIAL_START_SYMBOL, newSequence.getTarget()));
            const parser: RDParser = new RDParser(bnf, new Lexer(""), EBNFParsedNodeFactory.INSTANCE);

            const autocompletions: Autocompletion[] = [];
            parser.parse(autocompletions);

            const n: number = autocompletions.length;
            if(n > 1)
                autocompletionStringForChild = "${" + sequence.getNameForChild(i) + "}";
            else if(n == 1)
                autocompletionStringForChild = autocompletions[0].getCompletion();

            this.symbol2Autocompletion.set(key, autocompletionStringForChild as string);
            autocompletionString += autocompletionStringForChild;
        }
        return autocompletionString;
    }
}

module Autocompleter {
    export const VETO: string = 'VETO';

    export const DEFAULT_INLINE_AUTOCOMPLETER: Autocompleter = {
        getAutocompletion(pn: ParsedNode): string | undefined {
            let alreadyEntered = pn.getParsedString();
            if(alreadyEntered.length > 0)
                return VETO;
            let name = pn.getName();
            if(name !== undefined)
                return "${" + name + "}";
            name = pn.getSymbol().getSymbol();
            if(name !== undefined)
                return "${" + name + "}";
            return undefined;
        }
    }
};

export { Autocompleter, IfNothingYetEnteredAutocompleter, EntireSequenceCompleter };