import { ParsedNode } from "../../src/ParsedNode.js";
import { Parser } from "../../src/Parser.js";
import { Autocompleter } from "../../src/Autocompleter.js";
import { Autocompletion } from "../../src/core/Autocompletion.js";
import { BNF } from "../../src/core/BNF.js";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode.js";
import { Lexer } from "../../src/core/Lexer.js";
import { NonTerminal } from "../../src/core/NonTerminal.js";
import { ParsingState } from "../../src/core/ParsingState.js";
import { RDParser } from "../../src/core/RDParser.js";
import { Terminal } from "../../src/core/Terminal.js";
import { EBNFCore } from "../../src/ebnf/EBNFCore.js";
import { EBNFParsedNodeFactory } from "../../src/ebnf/EBNFParsedNodeFactory.js";
import { Rule } from "../../src/ebnf/Rule.js";


/**
 * 'one' ('two' | 'three' | 'four')* 'five'
 */
function makeGrammar(): BNF {
    const grammar: EBNFCore = new EBNFCore();

    const rule: Rule = grammar.sequence("expr",
        Terminal.literal("one").withName(),
        grammar.star(undefined,
            grammar.or(undefined,
                Terminal.literal("two").withName(),
                Terminal.literal("three").withName(),
                Terminal.literal("four").withName()
            ).setAutocompleter((pn, _justCheck) => {
                if(pn.getParsedString().length > 0)
                    return Autocompletion.veto(pn);
                return Autocompletion.parameterized(pn, pn.getName());
            }).withName("or"),
        ).withName("star"),
        Terminal.literal("five").withName()
    );

    grammar.compile(rule.getTarget());
    return grammar.getBNF();
}

function getCompletionStrings(autocompletions: Autocompletion[]): string[] {
    const ret = new Array<string>(autocompletions.length);
    for(let i = 0; i < ret.length; i++) {
        ret[i] = autocompletions[i].getCompletion(Autocompletion.Purpose.FOR_INSERTION) + " (" + autocompletions[i].getAlreadyEntered() + ")";
    }
    return ret;
}

function doTest(input: string, ...expectedCompletion: string[]): void {
    const grammar: BNF = makeGrammar();
    const l: Lexer = new Lexer(input);
    const test: RDParser = new RDParser(grammar, l, EBNFParsedNodeFactory.INSTANCE);
    const autocompletions: Autocompletion[] = [];
    const pn: DefaultParsedNode = test.parse(autocompletions);

    expect(pn.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
    expect(getCompletionStrings(autocompletions)).toEqual(expectedCompletion);
}

function test01(): void {
    doTest("", "one ()");
    doTest("o", "one (o)");
    doTest("one", "${or} ()", "five ()");
	doTest("onet");
}

function test02(): void {
    const parser: Parser = new Parser();
    parser.defineSentence("The first digit of the number is {first:digit}.", _pn => null);
    const autocompletions: Autocompletion[] = [];
    parser.parse("The first digit of the number is ", autocompletions);
    expect(autocompletions.length).toBe(1);
    expect(autocompletions[0].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toEqual("${first}");
}

function test03(): void {
    const parser: Parser = new Parser();
    parser.defineSentence("Define the output path {p:path}.", _pn => undefined);
    const autocompletions: Autocompletion[] = [];
    parser.parse("", autocompletions);
    expect(autocompletions.length).toBe(2);
    expect(autocompletions[1].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toEqual("Define the output path");
}

function test04(): void {
    const sentencesParsed: string[] = [];

    const parser: Parser = new Parser();
    parser.addParseStartListener(() => {
        sentencesParsed.length = 0;
        console.log("sentencesParsed clear");
    });
    parser.defineSentence("{d:digit:+}.", _pn => undefined).onSuccessfulParsed(p => {
        console.log("Successfully parsed " + p.getParsedString() + " by " + parser);
        sentencesParsed.push(p.getParsedString());
    })

    const autocompletions: Autocompletion[] = [];
    parser.parse("1.22.333.", autocompletions);

    const expected: string[] = ["1.", "22.", "333."];
    expect(sentencesParsed).toEqual(expected);
}

function test05(): void {
    const definedChannels: string[] = [];

    const parser: Parser = new Parser();
    parser.addParseStartListener(() => {
        definedChannels.length = 0;
        console.log("Clear defined channels");
    });
    parser.defineSentence("Define channel {channel-name:[A-Za-z0-9]:+}.", _pn => undefined)
        .onSuccessfulParsed(p => {
            console.log("Successfully parsed " + p.getParsedString("channel-name"));
            definedChannels.push(p.getParsedString("channel-name"));
        }
    );
    parser.defineType("defined-channels", "'{channel:[A-Za-z0-9]:+}'", _pn => undefined, (pn, _justCheck) => Autocompletion.literal(pn, definedChannels));

    parser.defineSentence("Use channel {channel:defined-channels}.", _e => undefined);

    const autocompletions: Autocompletion[] = [];

    const root: ParsedNode = parser.parse(
        "Define channel DAPI.\n" +
        "Define channel A488.\n" +
        "Use channel 'DAPI'.\n" +
        "Use channel 'A488'.\n" +
        "Use channel ", autocompletions);

    expect(root.getMatcher().state).toEqual(ParsingState.END_OF_INPUT);

    const expected: string[] = ["DAPI", "A488"];
    expect(autocompletions.map(a => a.getCompletion(Autocompletion.Purpose.FOR_INSERTION))).toEqual(expected);
}

function test06(): void {
    const ebnf: EBNFCore = new EBNFCore();
    ebnf.sequence("sentence",
        Terminal.literal("Define channel").withName(),
        Terminal.WHITESPACE.withName("ws"),
        ebnf.plus("name",
            Terminal.characterClass("[A-Za-z]").withName()
        ).withName("name"),
        Terminal.literal(".").withName()
    );
    const program: Rule = ebnf.star("program",
        new NonTerminal("sentence").withName("sentence"));

    ebnf.compile(program.getTarget());

    const text: string = "Define channel DA.D";

    const autocompletions: Autocompletion[] = [];

    const bnf: BNF = ebnf.getBNF();
    const parser: RDParser = new RDParser(bnf, new Lexer(text), EBNFParsedNodeFactory.INSTANCE);
    const pn = parser.parse(autocompletions);
    expect(pn.getMatcher().state).toEqual(ParsingState.END_OF_INPUT);
    expect(autocompletions.length).toBe(1);
    expect(autocompletions[0].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toBe("Define channel");
}

function test07(): void {
    const parser: Parser = new Parser();

    parser.defineType("led", "385nm", () => undefined, (e, _justCheck) => Autocompletion.literal(e, ["385nm"]) );
    parser.defineType("led", "470nm", () => undefined, (e, _justCheck) => Autocompletion.literal(e, ["470nm"]) );
    parser.defineType("led", "567nm", () => undefined, (e, _justCheck) => Autocompletion.literal(e, ["567nm"]) );
    parser.defineType("led", "625nm", () => undefined, (e, _justCheck) => Autocompletion.literal(e, ["625nm"]) );

    parser.defineType("led-power", "{<led-power>:int}%", (_e) => undefined, true);
    parser.defineType("led-setting", "{led-power:led-power} at {wavelength:led}", (_e) => undefined, true);

    parser.defineSentence(
            "Excite with {led-setting:led-setting}.",
            (_e) => undefined);

    const autocompletions: Autocompletion[] = [];
    const root: ParsedNode = parser.parse("Excite with 10% at 3", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
    expect(autocompletions.length).toBe(1);
    expect("385nm").toBe(autocompletions[0].getCompletion(Autocompletion.Purpose.FOR_INSERTION));
}

function test08(): void {
    const parser: Parser = new Parser();

    parser.defineType("my-color", "blue", undefined);
    parser.defineType("my-color", "green", undefined);
    parser.defineType("my-color", "({r:int}, {g:int}, {b:int})", undefined, true);
    parser.defineSentence("My favorite color is {color:my-color}.", undefined);

    const autocompletions: Autocompletion[] = [];
    const root: ParsedNode = parser.parse("My favorite color is ", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
    expect(autocompletions.length).toBe(3);
    expect(autocompletions[0].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toBe("blue");
    expect(autocompletions[1].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toBe("green");
    expect(autocompletions[2].getCompletion(Autocompletion.Purpose.FOR_INSERTION)).toBe("(${r}, ${g}, ${b})")
}

describe('TestAutocompletion', () => {
    test('test01', test01),
    test('test02', test02),
    // test('test03', test03),
    test('test04', test04),
    test('test05', test05),
    test('test06', test06),
    test('test07', test07)
    test('test08', test08)
});
