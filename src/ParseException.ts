import { Autocompletion } from "./core/Autocompletion.js";
import { BNF } from "./core/BNF.js";
import { DefaultParsedNode } from "./core/DefaultParsedNode.js";
import { Lexer } from "./core/Lexer.js";
import { RDParser } from "./core/RDParser.js";

export class ParseException extends Error {

	private readonly root: DefaultParsedNode;

	private readonly failedTerminal: DefaultParsedNode;

	private readonly parser: RDParser;

	private readonly firstAutocompletingAncestorThatFailed: DefaultParsedNode;

	constructor(root: DefaultParsedNode, failedTerminal: DefaultParsedNode, parser: RDParser) {
		super();
		this.root = root;
		this.failedTerminal = failedTerminal;
		this.parser = parser;

		let tmp: DefaultParsedNode = failedTerminal;
		while(tmp != null && !tmp.doesAutocomplete())
			tmp = tmp.getParent() as DefaultParsedNode;
		this.firstAutocompletingAncestorThatFailed = tmp;

        this.message = this.getError();
	}

	getRoot(): DefaultParsedNode {
		return this.root;
	}

	getFailedTerminal(): DefaultParsedNode {
		return this.failedTerminal;
	}

	getFirstAutocompletingAncestorThatFailed(): DefaultParsedNode {
		return this.firstAutocompletingAncestorThatFailed;
	}

	getError(): string {
		const lexer: Lexer = this.parser.getLexer();
		const grammar: BNF = this.parser.getGrammar();

		const errorPos: number = this.failedTerminal.getMatcher().pos + this.failedTerminal.getMatcher().parsed.length - 1;

		// the character at last.matcher.pos failed, everything before must have been working
		const workingText: string = lexer.substring(0, this.failedTerminal.getMatcher().pos);
		// create a new parser and collect the autocompletions
		const workingLexer: Lexer = new Lexer(workingText);
		const parser2: RDParser = new RDParser(grammar, workingLexer, this.parser.getParsedNodeFactory());
		const expectations: Autocompletion[] = [];
		try {
			parser2.parse(expectations);
		} catch (e: any) {
			return "Error at position " + errorPos;
		}

		const lines: string[] = lexer.substring(0, errorPos + 1).split(/\r?\n|\r/);
		const errorLine: number = lines.length - 1;
		const errorPosInLastLine: number = lines[errorLine].length - 1;

		let errorMessage: string = "";
		const nl: string = "\n";
        errorMessage += "Error at position " + errorPos + " in line " + errorLine + ":" + nl;
        errorMessage += lines[errorLine] + nl;
		for(let i = 0; i < errorPosInLastLine; i++)
			errorMessage += " ";
		errorMessage += "^" + nl;

        const exString: string[] = expectations.map(ac => ac.getCompletion(Autocompletion.Purpose.FOR_INSERTION))

		errorMessage += "Expected " + exString.toString();

		return errorMessage;
	}
}
