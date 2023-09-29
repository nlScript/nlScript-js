import { ParsedNode } from "../ParsedNode";
import { ParsedNodeFactory } from "../core/ParsedNodeFactory";
import { DefaultParsedNode } from "../core/DefaultParsedNode";
import { Matcher } from "../core/Matcher";
import { Production } from "../core/Production";
import { Sym } from "../core/Symbol";

module EBNFParsedNodeFactory {
    export const INSTANCE: ParsedNodeFactory = {
        createNode: (matcher: Matcher, symbol: Sym, production: Production): DefaultParsedNode => new ParsedNode(matcher, symbol, production)
    }
}

export { EBNFParsedNodeFactory };