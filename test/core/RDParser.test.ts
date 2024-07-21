import { BNF } from "../../src/core/BNF.js";
import { Lexer } from "../../src/core/Lexer.js";
import { NonTerminal } from "../../src/core/NonTerminal.js";
import { ParsingState } from "../../src/core/ParsingState.js";
import { Production } from "../../src/core/Production.js";
import { RDParser } from "../../src/core/RDParser.js";
import { Terminal } from "../../src/core/Terminal.js";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode.js";
import { ParsedNodeFactory } from "../../src/core/ParsedNodeFactory.js";


describe('testing index file', () => {
    test('empty string should result in zero', () => {

        const bnf = new BNF();



        bnf.addProduction(new Production(new NonTerminal("EXPR"),
            new NonTerminal("TERM"), Terminal.literal("+"), new NonTerminal("EXPR")));
        bnf.addProduction(new Production(new NonTerminal("EXPR"),
            new NonTerminal("TERM")));
        bnf.addProduction(new Production(new NonTerminal("TERM"),
            new NonTerminal("FACTOR"), Terminal.literal("*"), new NonTerminal("FACTOR")));
        bnf.addProduction(new Production(new NonTerminal("TERM"),
            new NonTerminal("FACTOR")));
        bnf.addProduction(new Production(new NonTerminal("FACTOR"),
            Terminal.DIGIT));

        bnf.addProduction(new Production(BNF.ARTIFICIAL_START_SYMBOL,
            new NonTerminal("EXPR"), BNF.ARTIFICIAL_STOP_SYMBOL));

        console.log(bnf.toString());

        let parser: RDParser = new RDParser(bnf, new Lexer("3+4*6+8"), ParsedNodeFactory.DEFAULT);
        let parsed: DefaultParsedNode = parser.parse();
        // assertEquals(ParsingState.SUCCESSFUL, parsed.getMatcher().state);
        expect(parsed.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    })
});
