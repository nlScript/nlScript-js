import { ParsedNode } from "../ParsedNode.js";
import { ParsedNodeFactory } from "../core/ParsedNodeFactory.js";
import { DefaultParsedNode } from "../core/DefaultParsedNode.js";
import { Matcher } from "../core/Matcher.js";
import { Production } from "../core/Production.js";
import { Sym } from "../core/Symbol.js";

module EBNFParsedNodeFactory {
    export const INSTANCE: ParsedNodeFactory = {
        createNode: (matcher: Matcher, symbol: Sym, production: Production): DefaultParsedNode => new ParsedNode(matcher, symbol, production)
    }
}

export { EBNFParsedNodeFactory };
