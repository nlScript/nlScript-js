import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { ParsingState } from "../../src/core/ParsingState";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("The first character of my name is {l:letter}.", pn => {
        const l: string = pn.evaluate("l");
        expect(l).toBe('B');
        return null;
    });


    hlp.defineSentence("The first two characters of my name are {l:letter:2}.", pn => {
        const l: string = pn.evaluate("l");
        expect(l).toBe("Be");
        return null;
    });
    
    let root: ParsedNode = hlp.parse("The first character of my name is B.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

	root = hlp.parse("The first two characters of my name are Be.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
	root.evaluate();
}

describe('TestLetter', () => {
    test('test01', test01)
});
