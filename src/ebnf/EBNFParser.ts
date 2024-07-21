import { ParsedNode } from "../ParsedNode.js";
import { BNF } from "../core/BNF.js";
import { DefaultParsedNode } from "../core/DefaultParsedNode.js";
import { Lexer } from "../core/Lexer.js";
import { RDParser, SymbolSequence } from "../core/RDParser.js";
import { EBNFParsedNodeFactory } from "./EBNFParsedNodeFactory.js";

type ParseStartListener = () => void;

class EBNFParser extends RDParser {

    private readonly parseStartListeners: ParseStartListener[] = [];

    constructor(grammar: BNF, lexer: Lexer) {
        super(grammar, lexer, EBNFParsedNodeFactory.INSTANCE);
    }

    protected override createParsedTree(leafSequence: SymbolSequence, retLast: DefaultParsedNode[]): DefaultParsedNode {
        this.fireParsingStarted();
        let root = super.createParsedTree(leafSequence, retLast);
        (root as ParsedNode).notifyListeners();
        return root;
    }

    addParseStartListener(l: ParseStartListener): void {
        this.parseStartListeners.push(l);
    }

    removeParseStartListener(l: ParseStartListener): void {
        let idx = this.parseStartListeners.indexOf(l);
        if(idx !== -1)
            this.parseStartListeners.splice(idx, 1);
    }

    private fireParsingStarted(): void {
        for(let l of this.parseStartListeners)
            l();
    }
}

export { ParseStartListener, EBNFParser };
