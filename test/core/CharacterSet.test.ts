import { ParsedNode } from "../../src/ParsedNode.js";
import { Parser } from "../../src/Parser.js";
import { ParsingState } from "../../src/core/ParsingState.js";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("An arbitrary alphanumeric character: {c:[a-zA-Z0-9]}.", pn => {
        const d: string = pn.evaluate("c");
        expect(d).toBe('f');
        return null;
    });


    hlp.defineSentence("Two arbitrary alphanumeric characters: {c:[a-zA-Z0-9]:2}.", pn => {
        const d: string[] = pn.evaluate("c");
        expect(d).toEqual(["f", "1"]);
        return null;
    });

    let root: ParsedNode = hlp.parse("An arbitrary alphanumeric character: f.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

	root = hlp.parse("Two arbitrary alphanumeric characters: f1.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
	root.evaluate();
}

describe('TestCharacterSet', () => {
    test('test01', test01)
});
