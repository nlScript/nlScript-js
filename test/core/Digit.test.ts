import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { ParsingState } from "../../src/core/ParsingState";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("The first digit of my telephone number is {d:digit}.", pn => {
        const d: string = pn.evaluate("d");
        expect(d).toBe('0');
        return null;
    });


    hlp.defineSentence("The first two digits of my telephone number are {d:digit:2}.", pn => {
        const d: string = pn.evaluate("d");
        expect(d).toBe("09");
        return null;
    });
    
    let root: ParsedNode = hlp.parse("The first digit of my telephone number is 0.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

	root = hlp.parse("The first two digits of my telephone number are 09.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
	root.evaluate();
}

describe('TestDigit', () => {
    test('test01', test01)
});
