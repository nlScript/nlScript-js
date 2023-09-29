import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { Autocompleter } from "../../src/Autocompleter";
import { Autocompletion } from "../../src/core/Autocompletion";
import { BNF } from "../../src/core/BNF";
import { DefaultParsedNode } from "../../src/core/DefaultParsedNode";
import { Lexer } from "../../src/core/Lexer";
import { NonTerminal } from "../../src/core/NonTerminal";
import { ParsingState } from "../../src/core/ParsingState";
import { RDParser } from "../../src/core/RDParser";
import { Terminal } from "../../src/core/Terminal";
import { EBNFCore } from "../../src/ebnf/EBNFCore";
import { EBNFParsedNodeFactory } from "../../src/ebnf/EBNFParsedNodeFactory";
import { Rule } from "../../src/ebnf/Rule";


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
            ).setAutocompleter({getAutocompletion: pn => {
                if(pn.getParsedString().length > 0)
                    return Autocompleter.VETO;
                return "${" + pn.getName() + "}";
            },}).withName("or"),
        ).withName("star"),
        Terminal.literal("five").withName()
    );
    
    grammar.compile(rule.getTarget());
    return grammar.getBNF();
}

function getCompletionStrings(autocompletions: Autocompletion[]): string[] {
    const ret = new Array<string>(autocompletions.length);
    for(let i = 0; i < ret.length; i++) {
        ret[i] = autocompletions[i].getCompletion() + " (" + autocompletions[i].getAlreadyEnteredText() + ")";
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
    expect(autocompletions[0]).toEqual(new Autocompletion("${first}", ""));
}

function test03(): void {
    const parser: Parser = new Parser();
    parser.defineSentence("Define the output path {p:path}.", _pn => undefined);
    const autocompletions: Autocompletion[] = [];
    parser.parse("", autocompletions);
    expect(autocompletions.length).toBe(2);
    expect(autocompletions[1]).toEqual(new Autocompletion("Define the output path", ""));
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
    parser.defineType("defined-channels", "'{channel:[A-Za-z0-9]:+}'", _pn => undefined, { getAutocompletion: _pn => definedChannels.join(";;;")} );

    parser.defineSentence("Use channel {channel:defined-channels}.", _e => undefined);

    const autocompletions: Autocompletion[] = [];

    const root: ParsedNode = parser.parse(
        "Define channel DAPI.\n" +
        "Define channel A488.\n" +
        "Use channel 'DAPI'.\n" +
        "Use channel 'A488'.\n" +
        "Use channel ", autocompletions);
    
    expect(root.getMatcher().state).toEqual(ParsingState.END_OF_INPUT);

    const expected: Autocompletion[] = [new Autocompletion("DAPI", ""), new Autocompletion("A488", "")];
    expect(autocompletions).toEqual(expected);
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
    expect(autocompletions[0].getCompletion()).toBe("Define channel");
}

function test07(): void {
    const parser: Parser = new Parser();

    parser.defineType("led", "385nm", () => undefined, { getAutocompletion: () => "385nm" });
    parser.defineType("led", "470nm", () => undefined, { getAutocompletion: () => "470nm" });
    parser.defineType("led", "567nm", () => undefined, { getAutocompletion: () => "567nm" });
    parser.defineType("led", "625nm", () => undefined, { getAutocompletion: () => "625nm" });

    parser.defineType("led-power", "{<led-power>:int}%", () => undefined, true);
    parser.defineType("led-setting", "{led-power:led-power} at {wavelength:led}", () => undefined, true);

    parser.defineSentence(
            "Excite with {led-setting:led-setting}.",
            () => undefined);

    const autocompletions: Autocompletion[] = [];
    const root: ParsedNode = parser.parse("Excite with 10% at 3", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
    expect(autocompletions.length).toBe(1);
    expect("385nm").toBe(autocompletions[0].getCompletion());
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
    expect(autocompletions[0].getCompletion()).toBe("blue");
    expect(autocompletions[1].getCompletion()).toBe("green");
    expect(autocompletions[2].getCompletion()).toBe("(${r}, ${g}, ${b})")
}

describe('TestAutocompletion', () => {
    test('test01', test01),
    test('test02', test02),
    test('test03', test03),
    test('test04', test04),
    test('test05', test05),
    test('test06', test06),
    test('test07', test07)
    test('test08', test08)
});
