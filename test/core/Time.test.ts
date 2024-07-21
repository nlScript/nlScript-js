import { ParsedNode } from "../../src/ParsedNode.js";
import { Parser } from "../../src/Parser.js";
import { ParsingState } from "../../src/core/ParsingState.js";


function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("The pizza comes at {t:time}.", pn => {
        const time: Date = pn.evaluate("t") as Date;
        expect(time.getHours()).toBe(20);
        expect(time.getMinutes()).toBe(30);
        return undefined;
    });

    const root: ParsedNode = hlp.parse("The pizza comes at 20:30.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();
}


describe('TestAutocompletion', () => {
    test('test01', test01)
});
