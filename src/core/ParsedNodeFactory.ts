import { DefaultParsedNode } from "./DefaultParsedNode";
import { Matcher } from "./Matcher";
import { Production } from "./Production";
import { Sym } from "./Symbol";

interface ParsedNodeFactory {
    createNode(matcher: Matcher, symbol: Sym, production: Production | undefined): DefaultParsedNode
}

module ParsedNodeFactory {
    export const DEFAULT: ParsedNodeFactory = {
        createNode: (matcher: Matcher, symbol: Sym, production: Production | undefined): DefaultParsedNode => new DefaultParsedNode(matcher, symbol, production)
    }
}

export { ParsedNodeFactory };
