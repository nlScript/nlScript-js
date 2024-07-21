import { ParseException } from "../../src/ParseException.js";
import { BNF } from "../../src/core/BNF.js";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode.js";
import { Lexer } from "../../src/core/Lexer.js";
import { ParsingState } from "../../src/core/ParsingState.js";
import { RDParser } from "../../src/core/RDParser.js";
import { Terminal } from "../../src/core/Terminal.js";
import { EBNFCore } from "../../src/ebnf/EBNFCore.js";
import { EBNFParsedNodeFactory } from "../../src/ebnf/EBNFParsedNodeFactory.js";
import { Rule } from "../../src/ebnf/Rule.js";


function makeGrammar(): BNF {
    const grammar: EBNFCore = new EBNFCore();
    const rule: Rule = grammar.or("or",
        grammar.sequence("seq1",
            Terminal.literal("y").withName(),
            Terminal.DIGIT.withName()
        ).withName("seq"),
        grammar.sequence("seq2",
            Terminal.literal("n").withName(),
            Terminal.DIGIT.withName()
        ).withName("seq"),
    )
    grammar.compile(rule.getTarget());
    return grammar.getBNF();
}

function testSuccess(input: string): void {
    const grammar: BNF = makeGrammar();
    const l: Lexer = new Lexer(input);
    const test: RDParser = new RDParser(grammar, l, EBNFParsedNodeFactory.INSTANCE);
    let root: DefaultParsedNode = test.parse();

    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);

    let parsed: DefaultParsedNode = root.getChildren()[0];
    expect(parsed.numChildren()).toBe(1);

    let child: DefaultParsedNode = parsed.getChild(0);
    expect(child.getParsedString()).toBe(input);
    expect(child.numChildren()).toBe(2);

    // test evaluate
    const evaluated: any = parsed.evaluate();
    expect(evaluated).toBe(input);

    // test names
    expect(child.getName()).toBe("seq");
}

function testFailure(input: string): void {
    const grammar: BNF = makeGrammar();

    const l: Lexer = new Lexer(input);
    const parser: RDParser = new RDParser(grammar, l, EBNFParsedNodeFactory.INSTANCE);

    try {
        const root: DefaultParsedNode = parser.parse();
        expect(root.getMatcher().state.equals(ParsingState.SUCCESSFUL)).toBeFalsy();
    } catch(e: any) {
        if(!(e instanceof ParseException))
            throw e;
    }
}

testSuccess("y1");

describe('TestOptional', () => {
    test('test01', () => testSuccess("y1")),
    test('test02', () => testSuccess("n3")),
    test('test03', () => testFailure("")),
    test('test04', () => testFailure("s"))
});
