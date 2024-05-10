import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { Named } from "../../src/core/Named";
import { BNF } from "../../src/core/BNF";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode";
import { Lexer } from "../../src/core/Lexer";
import { NonTerminal } from "../../src/core/NonTerminal";
import { ParsingState } from "../../src/core/ParsingState";
import { RDParser } from "../../src/core/RDParser";
import { CharacterClass, Terminal, Literal } from "../../src/core/Terminal";
import { EBNF } from "../../src/ebnf/EBNF";
import { EBNFCore } from "../../src/ebnf/EBNFCore";
import { EBNFParsedNodeFactory } from "../../src/ebnf/EBNFParsedNodeFactory";
import { Plus } from "../../src/ebnf/Plus";
import { Repeat } from "../../src/ebnf/Repeat";
import { Rule } from "../../src/ebnf/Rule";
import { Star } from "../../src/ebnf/Star";
import { IntRange } from "../../src/util/IntRange";
import { ParseException } from "../../src/ParseException";
import { Join } from "../../src/ebnf/Join";
import { Sym } from "src";


function evaluate(grammar: EBNF, input: string): any {
    const lexer = new Lexer(input);
    const parser = new RDParser(grammar.getBNF(), lexer, EBNFParsedNodeFactory.INSTANCE);
    let p: DefaultParsedNode = parser.parse();
    return p.evaluate();
}

function checkFailed(grammar: BNF, input: string): void {
    const lexer = new Lexer(input);
    const parser = new RDParser(grammar, lexer, EBNFParsedNodeFactory.INSTANCE);
    try {
        let p: DefaultParsedNode = parser.parse();
        expect(p.getMatcher().state === ParsingState.SUCCESSFUL).toBeFalsy();
    } catch(e: any) {
        if(!(e instanceof ParseException))
            throw e;
    }
}

function testQuantifier(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.QUANTIFIER.getTarget());

    expect(evaluate(grammar, "?").equals(IntRange.OPTIONAL));
    expect(evaluate(grammar, "*").equals(IntRange.STAR));
    expect(evaluate(grammar, "+").equals(IntRange.PLUS));
    expect(evaluate(grammar, "1-5").equals(new IntRange(1, 5)));
    expect(evaluate(grammar, "3").equals(new IntRange(3)));
}

function testIdentifier(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.IDENTIFIER.getTarget());
    const positives: string[] = ["bla", "_1-lkj", "A", "_"];
    const negatives: string[] = ["-abc", "abc-"];

    for (let test of positives) {
        expect(evaluate(grammar, test)).toBe(test);
    }
    for (let test of negatives) {
        checkFailed(grammar.getBNF(), test);
    }
}

function evaluateHighlevelParser(hlp: Parser, input: string): any {
    const lexer: Lexer = new Lexer(input);
    const parser: RDParser = new RDParser(hlp.getGrammar().getBNF(), lexer, EBNFParsedNodeFactory.INSTANCE);
    let p: DefaultParsedNode = parser.parse();
    if(p.getMatcher().state !== ParsingState.SUCCESSFUL)
        throw new Error("Parsing failed");
    return p.evaluate();
}

function testList(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.LIST.getTarget());

    const test: string = "list<int>";
    const list: Join = evaluateHighlevelParser(hlp, test) as Join;

    // now parse and evaluate the generated grammar
    const tgt: EBNFCore = hlp.getTargetGrammar();
    tgt.compile(list.getTarget());
    const rdParser: RDParser = new RDParser(tgt.getBNF(), new Lexer("1, 2, 3"), EBNFParsedNodeFactory.INSTANCE);
    const pn: DefaultParsedNode = rdParser.parse();
    expect(pn.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    const result: any[] = pn.evaluate();
    expect(result[0] as number).toBe(1);
    expect(result[1] as number).toBe(2);
    expect(result[2] as number).toBe(3);
}

function testTuple(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.TUPLE.getTarget());

    const test: string = "tuple<int,x, y>";
    const tuple: NonTerminal = evaluateHighlevelParser(hlp, test);

    // now parse and evaluate the generated grammar:
    const tgt: EBNFCore = hlp.getTargetGrammar();
    tgt.compile(tuple);
    const rdParser: RDParser = new RDParser(tgt.getBNF(), new Lexer("(1, 2)"), EBNFParsedNodeFactory.INSTANCE);

    let pn: DefaultParsedNode = rdParser.parse();

    expect(pn.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    const result: any[] = pn.evaluate();

    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
}

function testCharacterClass(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.CHARACTER_CLASS.getTarget());

    const nt: CharacterClass = evaluate(grammar, "[a-zA-Z]");
    expect(nt.getSymbol()).toEqual("[a-zA-Z]");
    expect(nt).toBeInstanceOf(CharacterClass);
}

function testType(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.TYPE.getTarget());

    // test tuple
    const test = "tuple<int,x,y,z>";
    const tuple: NonTerminal = evaluateHighlevelParser(hlp, test);

    // now parse and evaluate the generated grammar:
    const tgt = hlp.getTargetGrammar();
    tgt.compile(tuple);
    const rdParser: RDParser = new RDParser(tgt.getBNF(), new Lexer("(1, 2, 3)"), EBNFParsedNodeFactory.INSTANCE);
    const pn: DefaultParsedNode = rdParser.parse();
    expect(pn.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    const result: any[] = pn.evaluate();
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);

    // test list
    const hlp2: Parser = new Parser();
    const grammar2: EBNF = hlp2.getGrammar();
    grammar2.compile(hlp2.TYPE.getTarget());
    const test2: string = "list<int>";
    const list: Join = evaluateHighlevelParser(hlp2, test2) as Join;

    // now parse and evaluate the generated grammar:
    const tgt2 = hlp2.getTargetGrammar();
    tgt2.compile(list.getTarget());
    const rdParser2: RDParser = new RDParser(tgt2.getBNF(), new Lexer("1, 2, 3"), EBNFParsedNodeFactory.INSTANCE);
    const pn2: DefaultParsedNode = rdParser2.parse();
    expect(pn2.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    const result2: any[] = pn2.evaluate();
    expect(result2[0]).toBe(1);
    expect(result2[1]).toBe(2);
    expect(result2[2]).toBe(3);

    // test identifier
    const hlp3: Parser = new Parser();
    const grammar3: EBNF = hlp3.getGrammar();
    grammar3.compile(hlp3.TYPE.getTarget());
    const test3 = "int";
    const identifier: NonTerminal = evaluateHighlevelParser(hlp3, test3);

    // now parse and evaluate the generated grammar:
    const tgt3 = hlp3.getTargetGrammar();
    tgt3.compile(identifier);
    const rdParser3: RDParser = new RDParser(tgt3.getBNF(), new Lexer("3"), EBNFParsedNodeFactory.INSTANCE);
    const pn3: DefaultParsedNode = rdParser3.parse();
    expect(pn3.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    expect(pn3.evaluate()).toBe(3);
}

function testVariable(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.VARIABLE.getTarget());

    let test = "{bla:int:3-5}";
    let evaluatedNonTerminal: Named<NonTerminal>  = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("bla");
    let rule: Rule = hlp.getTargetGrammar().getRules(evaluatedNonTerminal.get())[0];
    expect(rule).toBeInstanceOf(Rule);
    let repeat: Repeat = rule as Repeat;
    expect(repeat.getFrom()).toBe(3);
    expect(repeat.getTo()).toBe(5);
    expect(repeat.getEntry().getSymbol()).toBe(EBNF.INTEGER_NAME);

    let evaluatedTerminal: Named<Terminal>;
    test = "{blubb:digit}";
    evaluatedNonTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("blubb");
    expect(evaluatedNonTerminal.getSymbol().getSymbol()).toEqual(EBNF.DIGIT_NAME);

    test = "{blubb:int:*}";
    evaluatedNonTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("blubb");
    rule = hlp.getTargetGrammar().getRules(evaluatedNonTerminal.get())[0];
    expect(rule).toBeInstanceOf(Star);
    const star: Star = rule as Star;
    expect(star.getEntry().getSymbol()).toBe(EBNF.INTEGER_NAME);

    test = "{blubb:[A-Z]:+}";
    evaluatedNonTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("blubb");
    rule = hlp.getTargetGrammar().getRules(evaluatedNonTerminal.get())[0];
    expect(rule).toBeInstanceOf(Plus);
    let plus: Plus = rule as Plus;
    const chclass: Sym = plus.getEntry();
    expect(chclass.getSymbol()).toBe("[A-Z]");

    test = "{blubb , alkjad asd 4. <>l}";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe("blubb , alkjad asd 4. <>l");
    expect(evaluatedTerminal.getName()).toBe("blubb , alkjad asd 4. <>l");

    test = "{heinz}";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe("heinz");
    expect(evaluatedTerminal.getName()).toBe("heinz");

    test = "{heinz:+}";
    evaluatedNonTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("heinz");
    rule = hlp.getTargetGrammar().getRules(evaluatedNonTerminal.get())[0];
    expect(rule).toBeInstanceOf(Plus);
    plus = rule as Plus;
    expect(plus.getEntry().getSymbol()).toBe("heinz");

    test = "{heinz:3-5}";
    evaluatedNonTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedNonTerminal.getName()).toBe("heinz");
    rule = hlp.getTargetGrammar().getRules(evaluatedNonTerminal.get())[0];
    expect(rule).toBeInstanceOf(Repeat);
    repeat = rule as Repeat;
    expect(repeat.getFrom()).toBe(3);
    expect(repeat.getTo()).toBe(5);
    expect(repeat.getEntry().getSymbol()).toBe("heinz");

    test = "{, }";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe(", ");
    expect(evaluatedTerminal.getName()).toBe(", ");

    test = "{,\n }";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe(",\n ");
    expect(evaluatedTerminal.getName()).toBe(",\n ");
}

function testNoVariable(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.NO_VARIABLE.getTarget());

    let test = "lk345}.-";
    let evaluatedTerminal: Named<Terminal> = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.get()).toBeInstanceOf(Literal);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe(test);
    expect(evaluatedTerminal.getName()).toBe(Named.UNNAMED);

    test = "--1'x}";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.get()).toBeInstanceOf(Literal);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe(test);
    expect(evaluatedTerminal.getName()).toBe(Named.UNNAMED);

    test = ".";
    evaluatedTerminal = evaluateHighlevelParser(hlp, test);
    expect(evaluatedTerminal.get()).toBeInstanceOf(Literal);
    expect(evaluatedTerminal.getSymbol().getSymbol()).toBe(test);
    expect(evaluatedTerminal.getName()).toBe(Named.UNNAMED);

    const testToFail: string = "lj{l";
    const hlp2: Parser = hlp;
    expect(() => evaluateHighlevelParser(hlp2, testToFail)).toThrowError(ParseException);
}

function testExpression(): void {
    const hlp: Parser = new Parser();
    const grammar: EBNF = hlp.getGrammar();
    grammar.compile(hlp.EXPRESSION.getTarget());

    const test = "Today, let's wait for {time:int} minutes.";
    const rhs: Named<any>[]  = evaluateHighlevelParser(hlp, test);
    const tgt: EBNFCore = hlp.getTargetGrammar();
    const myType: Rule = tgt.sequence("mytype", ...rhs);

    // now parse and evaluate the generated grammar:
    tgt.compile(myType.getTarget());
    const rdParser: RDParser = new RDParser(tgt.getBNF(), new Lexer("Today, let's wait for 5 minutes."), EBNFParsedNodeFactory.INSTANCE);
    const pn: DefaultParsedNode = rdParser.parse();
    expect(pn.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
}

function testDefineType(): void {
    const hlp: Parser = new Parser();
    hlp.defineType("percentage", "{p:int} %", pn => pn.evaluate("p"));

    hlp.defineSentence("Now it is only {p:percentage}.", pn => {
        const percentage: number = pn.evaluate("p");
        expect(percentage).toBe(5);
        return undefined;
    });
    hlp.defineSentence("There is still {p:percentage} left.", pn => {
        const percentage: number = pn.evaluate("p");
        expect(percentage).toBe(38);
        return undefined;
    });

    const pn: ParsedNode = hlp.parse(
            "There is still 38 % left.\n" +
            "Now it is only 5 %.", undefined);

    expect(pn.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    pn.evaluate();
}

describe('HighlevelParserTest', () => {
    test('testQuantifier', testQuantifier),
    test('testIdentifier', testIdentifier),
    test('testList', testList),
    test('testTuple', testTuple),
    test('testCharacterClass', testCharacterClass),
    test('testType', testType),
    test('testVariable', testVariable),
    test('testNoVariable', testNoVariable),
    test('testExpression', testExpression),
    test('testDefineType', testDefineType)
});