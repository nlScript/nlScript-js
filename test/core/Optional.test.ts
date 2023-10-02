import { ParseException } from "../../src/ParseException";
import { BNF } from "../../src/core/BNF";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode";
import { Lexer } from "../../src/core/Lexer";
import { ParsingState } from "../../src/core/ParsingState";
import { RDParser } from "../../src/core/RDParser";
import { Terminal } from "../../src/core/Terminal";
import { EBNFCore } from "../../src/ebnf/EBNFCore";
import { EBNFParsedNodeFactory } from "../../src/ebnf/EBNFParsedNodeFactory";
import { Rule } from "../../src/ebnf/Rule";


function makeGrammar(): BNF {
    const grammar: EBNFCore = new EBNFCore();
    const rule: Rule = grammar.optional("optional",
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
    test('test01', () => testSuccess("")),
    test('test02', () => testSuccess("1a")),
    test('test03', () => testFailure("123")),
    test('test04', () => testFailure("s"))
});