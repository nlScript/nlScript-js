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


function makeGrammar(lower: number, upper: number): BNF {
    const grammar: EBNFCore = new EBNFCore();
    const rule: Rule = grammar.repeat("repeat",
        grammar.sequence("seq",
            Terminal.DIGIT.withName(),
            Terminal.LETTER.withName()
        ).withName("seq"),
        lower,
        upper
    );
    grammar.compile(rule.getTarget());
    return grammar.getBNF();
}

function testSuccess(grammar: BNF, input: string): void {
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

function testFailure(grammar: BNF, input: string): void {
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
    test('test01', () => {
        const g: BNF = makeGrammar(1, 1);
        testSuccess(g, "1a");
        testFailure(g, "");
        testFailure(g, "1a1a");
        testFailure(g, "s");
    }),
    test('test02', () => {
        const g: BNF = makeGrammar(0, 1);
        testSuccess(g, "1a");
        testSuccess(g, "");
        testFailure(g, "1a1a");
        testFailure(g, "s");
    }),
    test('test03', () => {
        const g: BNF = makeGrammar(0, 0);
        testFailure(g, "1a");
        testSuccess(g, "");
        testFailure(g, "1a1a");
        testFailure(g, "s");      
    }),
    test('test04', () => {
        const g: BNF = makeGrammar(1, 3);
        testFailure(g, "");
        testSuccess(g, "1a");
        testSuccess(g, "1a2a");
        testSuccess(g, "1a2a3a");  
        testFailure(g, "1a2a3a4a");
        testFailure(g, "s");
    }),
    test('test05', () => {
        const g: BNF = makeGrammar(0, 3);
        testSuccess(g, "");
        testSuccess(g, "1a");
        testSuccess(g, "1a2a");
        testSuccess(g, "1a2a3a");  
        testFailure(g, "1a2a3a4a");
        testFailure(g, "s");
    })
});
