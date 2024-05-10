import { Autocompletion } from "../../src/core/Autocompletion";
import { ParsedNode } from "../../src/ParsedNode";
import { Parser } from "../../src/Parser";
import { ParsingState } from "../../src/core/ParsingState";

function test01(): void {
    const hlp: Parser = new Parser();
    hlp.defineSentence("My birthday is in {m:month}.", pn => {
        const m: number = pn.evaluate("m");
        expect(m).toBe(2);
        return null;
    });


    let root: ParsedNode = hlp.parse("My birthday is in March.", undefined);
    expect(root.getMatcher().state).toBe(ParsingState.SUCCESSFUL);
    root.evaluate();

    let autocompletions: Autocompletion[] = [];

	root = hlp.parse("My birthday is in ", autocompletions);
    expect(root.getMatcher().state).toBe(ParsingState.END_OF_INPUT);
	expect(autocompletions.length).toBe(12);
    expect(autocompletions[0] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("January");
    expect(autocompletions[1] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("February");
    expect(autocompletions[2] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("March");
    expect(autocompletions[3] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("April");
    expect(autocompletions[4] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("May");
    expect(autocompletions[5] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("June");
    expect(autocompletions[6] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("July");
    expect(autocompletions[7] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("August");
    expect(autocompletions[8] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("September");
    expect(autocompletions[9] .getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("October");
    expect(autocompletions[10].getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("November");
    expect(autocompletions[11].getCompletion(Autocompletion.Purpose.FOR_MENU)).toBe("December");
}

describe('TestMonth', () => {
    test('test01', test01)
});
