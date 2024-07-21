import { ParsedNode } from "../../src/ParsedNode.js";
import { Parser } from "../../src/Parser.js";
import { ParsingState } from "../../src/core/ParsingState.js";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("My cat was born on {d:date}.", pn => {
        const d: Date = pn.evaluate("d");
        expect(d.getDate()).toBe(3);
        expect(d.getMonth()).toBe(9);
        expect(d.getFullYear()).toBe(2020);
        return null;
    });


    let root: ParsedNode = hlp.parse("My cat was born on 03 October 2020.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

}

describe('TestDate', () => {
    test('test01', test01)
});
