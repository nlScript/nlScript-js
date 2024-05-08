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
    getAutocompletion(n: ParsedNode, justCheck: boolean): Autocompletion[] | undefined;
}

class IfNothingYetEnteredAutocompleter implements Autocompleter {
    private readonly ifNothingYetEntered: string;
    private readonly otherwise: string | undefined;

    constructor(ifNothingYetEntered: string, otherwise: string | undefined) {
        this.ifNothingYetEntered = ifNothingYetEntered;
        this.otherwise = otherwise;
    }

    getAutocompletion(pn: ParsedNode, _justCheck: boolean): Autocompletion[] | undefined {
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

    getAutocompletion(pn: ParsedNode, _justCheck: boolean): Autocompletion[] | undefined {
        const alreadyEntered: string = pn.getParsedString();

        const sequence: Rule = pn.getRule() as Rule;
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
        const idx: number | undefined = entireSequenceCompletion.getCompletion().indexOf("${");
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