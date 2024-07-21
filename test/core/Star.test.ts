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
    const rule: Rule = grammar.star("star",
        grammar.sequence("seq",
            Terminal.DIGIT.withName(),
            Terminal.LETTER.withName()
    ).withName("seq"));
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
    expect(parsed.numChildren()).toBe(Math.ceil(input.length / 2));

    let i = 0;
    for(let child of parsed.getChildren()) {
        expect(child.getParsedString()).toBe(input.substring(i, i + 2));
        expect(child.numChildren()).toBe(2);
        i += 2;
    }

    // test evaluate
    const evaluated: any[] = parsed.evaluate();
    for(i = 0; i < evaluated.length; i++)
        expect(evaluated[i]).toBe(input.substring(2 * i, 2 * i + 2));

    // test names
    for(let child of parsed.getChildren())
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

describe('TestOptional', () => {
    test('test01', () => testSuccess("1a2b3c")),
    test('test02', () => testSuccess("1a")),
    test('test03', () => testSuccess("")),
    test('test04', () => testFailure("s"))
});
