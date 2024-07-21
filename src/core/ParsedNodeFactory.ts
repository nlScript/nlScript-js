import { DefaultParsedNode } from "./DefaultParsedNode.js";
import { Matcher } from "./Matcher.js";
import { Production } from "./Production.js";
import { Sym } from "./Symbol.js";

interface ParsedNodeFactory {
    createNode(matcher: Matcher, symbol: Sym, production: Production | undefined): DefaultParsedNode
}

module ParsedNodeFactory {
    export const DEFAULT: ParsedNodeFactory = {
        createNode: (matcher: Matcher, symbol: Sym, production: Production | undefined): DefaultParsedNode => new DefaultParsedNode(matcher, symbol, production)
    }
}

export { ParsedNodeFactory };
