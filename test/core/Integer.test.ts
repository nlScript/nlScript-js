import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { Autocompletion } from "../../src/core/Autocompletion";
import { ParsingState } from "../../src/core/ParsingState";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("Now there are only {p:int}% left.", pn => {
        const p: number = pn.evaluate("p");
        expect(p).toBe(35);
        return null;
    });

    const autocompletions: Autocompletion[] = [];
    
    let root: ParsedNode = hlp.parse("Now there are only 5", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
    expect(autocompletions.length).toBe(0);

	root = hlp.parse("Now there are only 35% left.", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
	root.evaluate();
}

describe('TestOptional', () => {
    test('test01', test01)
});
