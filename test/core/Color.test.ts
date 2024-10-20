import { ParsedNode } from "../../src/ParsedNode.js";
import { Parser } from "../../src/Parser.js";
import { Autocompletion } from "../../src/core/Autocompletion.js";
import { ParsingState } from "../../src/core/ParsingState.js";


function rgb2int(r: number, g: number, b: number): number {
    return (0xff << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("My favorite color is {text-color:color}.", pn => {
        const color: number = pn.evaluate("text-color");
        expect(color).toBe(rgb2int(128, 255, 0));
        return undefined;
    });

    const autocompletions: Autocompletion[] = [];
    let root: ParsedNode = hlp.parse("My favorite color is ", autocompletions);

    const actual: string[] = autocompletions.map(ac => ac.getCompletion(Autocompletion.Purpose.FOR_INSERTION));
    const expected: string[] = [
        "(${red}, ${green}, ${blue})",
        "black",
        "white",
        "red",
        "orange",
        "yellow",
        "lawn green",
        "green",
        "spring green",
        "cyan",
        "azure",
        "blue",
        "violet",
        "magenta",
        "pink",
        "gray" ];

    expect(actual).toEqual(expected);

    root = hlp.parse("My favorite color is lawn green.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();
}

describe('TestAutocompletion', () => {
    test('test01', test01)
});
