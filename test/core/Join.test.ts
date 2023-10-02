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
import { IntRange } from "../../src/util/IntRange";


function makeGrammar(withOpenAndClose: boolean, withDelimiter: boolean, range: IntRange): BNF {
    const grammar: EBNFCore = new EBNFCore();
    const rule: Rule = grammar.join("join",
            Terminal.DIGIT.withName("digit"),
            withOpenAndClose ? Terminal.literal("(") : undefined,
            withOpenAndClose ? Terminal.literal(")") : undefined,
            withDelimiter    ? Terminal.literal(",") : undefined,
            true,
            range);
        
    grammar.compile(rule.getTarget());
    return grammar.getBNF();
}

function testSuccess(grammar: BNF, input: string, ...result: string[]): void {
    const l: Lexer = new Lexer(input);
    const test: RDParser = new RDParser(grammar, l, EBNFParsedNodeFactory.INSTANCE);
    let root: DefaultParsedNode = test.parse();

    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);

    let parsed: DefaultParsedNode = root.getChildren()[0];
    expect(parsed.numChildren()).toBe(result.length);
    expect(parsed.getParsedString()).toBe(input);

    let i = 0;
    for(let child of parsed.getChildren()) {
        expect(child.getParsedString()).toBe(result[i]);
        expect(child.numChildren()).toBe(0);
        i++;
    }

    // test evaluate
    const evaluated: any[] = parsed.evaluate();
    for(i = 0; i < evaluated.length; i++)
        expect(evaluated[i]).toBe(result[i]);

    // test names
    for(let child of parsed.getChildren())
        expect(child.getName()).toBe(Terminal.DIGIT.getSymbol());
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

function testKeepDelimiters(): void {
    const grammar: EBNFCore = new EBNFCore();
    const rule: Rule = grammar.join("join",
            Terminal.DIGIT.withName(),
            Terminal.literal("("),
            Terminal.literal(")"),
            Terminal.literal(","),
            false, // onlyKeepEntries
            ["ha", "ho", "hu"]);
    grammar.compile(rule.getTarget());

    const input = "(1,3,4)";
    const l = new Lexer(input);
    const test = new RDParser(grammar.getBNF(), l, EBNFParsedNodeFactory.INSTANCE);
    let root = test.parse();

    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);

    const parsedJoinNode: DefaultParsedNode = root.getChild(0);
    expect(parsedJoinNode.numChildren()).toBe(7);

    // test names
    expect(parsedJoinNode.getChild(0).getName()).toBe("open");
    expect(parsedJoinNode.getChild(1).getName()).toBe("ha");
    expect(parsedJoinNode.getChild(2).getName()).toBe("delimiter");
    expect(parsedJoinNode.getChild(3).getName()).toBe("ho");
    expect(parsedJoinNode.getChild(4).getName()).toBe("delimiter" );
    expect(parsedJoinNode.getChild(5).getName()).toBe("hu");
    expect(parsedJoinNode.getChild(6).getName()).toBe("close");
}

function test01(): void {
    let withOpenClose = [true, true, false, false];
    let withDelimiter = [true, false, true, false];
    let inputs = [
        [ // with open/close, with delimiter
            "",
            "()",
            "(1)",
            "(1,2)",
            "(1,2,3)",
            "1,2,3",
            "s"
        ],
        [ // with open/close, without delimiter
            "",
            "()",
            "(1)",
            "(12)",
            "(123)",
            "123",
            "s"
        ],
        [ // without open/close, with delimiter
            "()",
            "",
            "1",
            "1,2",
            "1,2,3",
            "(1,2,3)",
            "s"
        ],
        [ // without open/close, without delimiter
            "()",
            "",
            "1",
            "12",
            "123",
            "(123)",
            "s"
        ]
    ]; // inputs = 
    for(let i = 0; i < 3; i++) {
        let grammar: BNF = makeGrammar(withOpenClose[i], withDelimiter[i], IntRange.PLUS);
        testFailure(grammar, inputs[i][0]);
        testFailure(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testSuccess(grammar, inputs[i][3], "1", "2");
        testSuccess(grammar, inputs[i][4], "1", "2", "3");
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], IntRange.STAR);
        testFailure(grammar, inputs[i][0]);
        testSuccess(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testSuccess(grammar, inputs[i][3], "1", "2");
        testSuccess(grammar, inputs[i][4], "1", "2", "3");
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], IntRange.OPTIONAL);
        testFailure(grammar, inputs[i][0]);
        testSuccess(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testFailure(grammar, inputs[i][3]);
        testFailure(grammar, inputs[i][4]);
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], new IntRange(0, 0));
        testFailure(grammar, inputs[i][0]);
        testSuccess(grammar, inputs[i][1]);
        testFailure(grammar, inputs[i][2]);
        testFailure(grammar, inputs[i][3]);
        testFailure(grammar, inputs[i][4]);
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], new IntRange(1, 1));
        testFailure(grammar, inputs[i][0]);
        testFailure(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testFailure(grammar, inputs[i][3]);
        testFailure(grammar, inputs[i][4]);
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], new IntRange(0, 2));
        testFailure(grammar, inputs[i][0]);
        testSuccess(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testSuccess(grammar, inputs[i][3], "1", "2");
        testFailure(grammar, inputs[i][4]);
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);

        grammar = makeGrammar(withOpenClose[i], withDelimiter[i], new IntRange(1, 2));
        testFailure(grammar, inputs[i][0]);
        testFailure(grammar, inputs[i][1]);
        testSuccess(grammar, inputs[i][2], "1");
        testSuccess(grammar, inputs[i][3], "1", "2");
        testFailure(grammar, inputs[i][4]);
        testFailure(grammar, inputs[i][5]);
        testFailure(grammar, inputs[i][6]);
    }
}

describe('TestOptional', () => {
    test('test01', () => test01()),
    test('testKeepDelimiters', () => testKeepDelimiters())
});
