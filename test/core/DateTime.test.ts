import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { ParsingState } from "../../src/core/ParsingState";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("My daughter's school started {d:date-time}.", pn => {
        const d: Date = pn.evaluate("d");
        expect(d.getDate()).toBe(12);
        expect(d.getMonth()).toBe(8);
        expect(d.getFullYear()).toBe(2020);
        expect(d.getHours()).toBe(8);
        expect(d.getMinutes()).toBe(0);
        expect(d.getSeconds()).toBe(0);
        expect(d.getMilliseconds()).toBe(0);
        return null;
    });


    let root: ParsedNode = hlp.parse("My daughter's school started 12 September 2020 8:00.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

}

describe('TestDateTime', () => {
    test('test01', test01)
});
