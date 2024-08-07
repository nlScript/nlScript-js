import { Autocompleter } from "../Autocompleter.js";
import { Autocompletion } from "./Autocompletion.js";
import { ParsedNodeFactory } from "./ParsedNodeFactory.js";
import { BNF } from "./BNF.js";
import { DefaultParsedNode } from "./DefaultParsedNode.js";
import { Lexer } from "./Lexer.js";
import { Matcher } from "./Matcher.js";
import { NonTerminal } from "./NonTerminal.js";
import { ParsingState } from "./ParsingState.js";
import { Production } from "./Production.js";
import { Sym } from "./Symbol.js";
import { Terminal } from "./Terminal.js";
import { ParseException } from "../ParseException.js";

class RDParser {
    private readonly parsedNodeFactory: ParsedNodeFactory;

    private readonly grammar: BNF;
    private readonly lexer: Lexer;

    constructor(grammar: BNF, lexer: Lexer, parsedNodeFactory: ParsedNodeFactory) {
        this.grammar = grammar;
        this.lexer = lexer;
        this.parsedNodeFactory = parsedNodeFactory;
    }

    getLexer(): Lexer {
        return this.lexer;
    }

    getGrammar(): BNF {
        return this.grammar;
    }

    getParsedNodeFactory(): ParsedNodeFactory {
        return this.parsedNodeFactory;
    }

    parse(autocompletions?: Array<Autocompletion | undefined>): DefaultParsedNode {
        let seq = new SymbolSequence(BNF.ARTIFICIAL_START_SYMBOL, undefined, undefined);
        let endOfInput: SymbolSequence[] = [];
        let parsedSequence: SymbolSequence = this.parseRecursive(seq, endOfInput);
        if(autocompletions !== undefined)
            this.collectAutocompletions(endOfInput, autocompletions as Autocompletion[])
        let last: DefaultParsedNode[] = [];
        let ret: DefaultParsedNode = this.createParsedTree(parsedSequence, last);
        ret = this.buildAst(ret);
        if(ret.getMatcher().state === ParsingState.FAILED)
            throw new ParseException(ret, last[0], this);
        return ret;
    }

    private buildAst(pn: DefaultParsedNode): DefaultParsedNode {
        let children: DefaultParsedNode[] = [];
        for(let i = 0; i < pn.numChildren(); i++) {
            children.push(this.buildAst(pn.getChild(i)))
        }
        pn.removeAllChildren();
        let production = pn.getProduction();
        if(production !== undefined)
            production.builtAST(pn, ...children);

        return pn;
    }

    private collectAutocompletions(endOfInput: SymbolSequence[], autocompletions: Autocompletion[]): void {
        if(autocompletions === null || autocompletions === undefined)
            throw new Error("autocompletions should be defined at this point");

        const autocompletingParents: DefaultParsedNode[] = [];
        for (const seq of endOfInput) {
            this.collectAutocompletingParents(seq, autocompletingParents);
        }

        const done: Set<string> = new Set();
        for(const autocompletingParent of autocompletingParents) {
            const prod = autocompletingParent.getProduction();
            let key: string;
            if(prod !== undefined) {
                key = prod.getLeft().getSymbol() + ":";
                for(const s of prod.getRight())
                    key += s.getSymbol();
            }
            else {
                key = autocompletingParent.getSymbol().getSymbol();
            }
            if(!done.has(key)) {
                const veto: boolean = this.addAutocompletions(autocompletingParent, autocompletions);
                done.add(key);
                if(veto)
                    break;
            }
        }
    }

    private collectAutocompletingParents(symbolSequence: SymbolSequence, autocompletingParents: Array<DefaultParsedNode>): void {
        let last: DefaultParsedNode[] = [];
        this.createParsedTree(symbolSequence, last);

        // get a trace to the root
        let pathToRoot: DefaultParsedNode[] = [];
        let parent: DefaultParsedNode | undefined = last[0];
        while(parent !== undefined) {
            pathToRoot.push(parent);
            parent = parent.getParent();
        }

        // find the node closest to root which provides autocompletion
        let autocompletingParent: DefaultParsedNode | undefined = undefined;
        for(let i = pathToRoot.length - 1; i >= 0; i--) {
            let tmp = pathToRoot[i];
            if(tmp.doesAutocomplete()) {
                autocompletingParent = tmp;
                break;
            }
        }
        if(autocompletingParent !== undefined)
            autocompletingParents.push(autocompletingParent);
    }

    private addAutocompletions(autocompletingParent: DefaultParsedNode, autocompletions: Array<Autocompletion | undefined>): boolean {
        let autocompletingParentStart: number = autocompletingParent.getMatcher().pos;
        let alreadyEntered: string = this.lexer.substring(autocompletingParentStart);
        let completion: Autocompletion[] | undefined = autocompletingParent.getAutocompletion(false);
        if(completion !== undefined) {
            for(let c of completion) {
                if(c === undefined || c.isEmptyLiteral())
                    continue;
                if(c instanceof Autocompletion.Veto) {
                    autocompletions.length = 0;
                    return true;
                }
                c.setAlreadyEntered(alreadyEntered);
                const cCompletion: string = c.getCompletion(Autocompletion.Purpose.FOR_MENU);
                if(!autocompletions.some(ac => ac?.getCompletion(Autocompletion.Purpose.FOR_MENU) === cCompletion))
                    autocompletions.push(c);
            }
        }
        return false;
    }

    private parseRecursive(symbolSequence: SymbolSequence, endOfInput: Array<SymbolSequence>): SymbolSequence {
        // console.log("parseRecursive");
        // console.log("  symbol sequence = " + symbolSequence);
        // console.log("  lexer           = " + this.lexer);
        let next: Sym = symbolSequence.getCurrentSymbol();
        // console.log("next = " + next);

        while(next.isTerminal()) {
            // console.log("next is a terminal node, lexer pos = " + this.lexer.getPosition());
            let matcher = (next as Terminal).matches(this.lexer);
            // console.log("matcher = " + matcher);
            symbolSequence.addMatcher(matcher);
            if(matcher.state.equals(ParsingState.END_OF_INPUT) && endOfInput !== undefined)
                endOfInput.push(symbolSequence);

            if(!matcher.state.equals(ParsingState.SUCCESSFUL))
                return symbolSequence;

            symbolSequence.incrementPosition();
            this.lexer.fwd(matcher.parsed.length);
            if(this.lexer.isDone())
                return symbolSequence;
            next = symbolSequence.getCurrentSymbol();
        }

        let u: NonTerminal = next as NonTerminal;
        let alternates: Production[] = this.grammar.getProductions(u);
        let best: SymbolSequence | undefined = undefined;
        let lexerPosOfBest: number = this.lexer.getPosition();
        for(let alternate of alternates) {
            let lexerPos: number = this.lexer.getPosition();
            let nextSequence: SymbolSequence = symbolSequence.replaceCurrentSymbol(alternate);
            let parsedSequence: SymbolSequence = this.parseRecursive(nextSequence, endOfInput);
            let m: Matcher | undefined = parsedSequence.getLastMatcher();
            if(m !== undefined) {
                if(m.state.equals(ParsingState.SUCCESSFUL))
                    return parsedSequence;
                if(best === undefined || m.isBetterThan(best.getLastMatcher())) {
                    best = parsedSequence;
                    lexerPosOfBest = this.lexer.getPosition();
                }
            }
            this.lexer.setPosition(lexerPos);
        }

        if(best !== undefined)
            this.lexer.setPosition(lexerPosOfBest);

        return best as SymbolSequence;
    }

    protected createParsedTree(leafSequence: SymbolSequence, retLast: DefaultParsedNode[]): DefaultParsedNode {
		const parsedNodeSequence: DefaultParsedNode[] = [];
		const nParsedMatchers: number = leafSequence.parsedMatchers.length;
		for(let i = 0; i < leafSequence.sequence.length; i++) {
            let symbol: Sym = leafSequence.sequence[i];
			let matcher: Matcher = i < nParsedMatchers
					? leafSequence.parsedMatchers[i]
					: new Matcher(ParsingState.NOT_PARSED, 0, "");  // TODO maybe this should not be 0

			let pn: DefaultParsedNode = this.parsedNodeFactory.createNode(matcher, symbol, undefined);
			parsedNodeSequence.push(pn);
		}

		if(retLast !== undefined)
			retLast[0] = parsedNodeSequence[nParsedMatchers - 1];

		let childSequence: SymbolSequence = leafSequence;
		while(childSequence.parent !== undefined) {
			let parentSequence: SymbolSequence = childSequence.parent;
			let productionToCreateChildSequence: Production | undefined = childSequence.production;
			if(productionToCreateChildSequence === undefined)
                throw new Error("production may not be undefined at this point");
			let pos: number = parentSequence.pos;
			let rhs: Sym[] = productionToCreateChildSequence.getRight();
			let lhs: Sym = productionToCreateChildSequence.getLeft();
			let rhsSize = rhs.length;
			let childList: DefaultParsedNode[] = parsedNodeSequence.slice(pos, pos + rhsSize);

			let matcher: Matcher = RDParser.matcherFromChildSequence(childList);
			let newParent: DefaultParsedNode = this.parsedNodeFactory.createNode(matcher, lhs, productionToCreateChildSequence);
			newParent.addChildren(...childList);
			parsedNodeSequence.splice(pos, rhsSize, newParent);

			childSequence = childSequence.parent;
		}

		let root: DefaultParsedNode = parsedNodeSequence[0];
		if(!root.getSymbol().equals(BNF.ARTIFICIAL_START_SYMBOL))
            throw new Error("");

		RDParser.notifyExtensionListeners(root);

		return root;
	}

    private static notifyExtensionListeners(pn: DefaultParsedNode): void {
        const production = pn.getProduction();
        if(production !== undefined) {
            production.wasExtended(pn, ...pn.getChildren());
            for(let child of pn.getChildren())
                this.notifyExtensionListeners(child);
        }
    }

    private static matcherFromChildSequence(children: DefaultParsedNode[]): Matcher {
        let pos = -1;
        let state = ParsingState.NOT_PARSED;
        let parsed = "";
        for(let child of children) {
            // already encountered EOI or FAILED before, do nothing
            if(state.equals(ParsingState.END_OF_INPUT) || state.equals(ParsingState.FAILED))
                break;

            const matcher = child.getMatcher();
            const childState = matcher.state;
            if(!childState.equals(ParsingState.NOT_PARSED)) {
                if(pos === -1)
                    pos = matcher.pos; // parent pos is the pos of the first child which is not NOT_PARSED
                if(state.equals(ParsingState.NOT_PARSED) || !childState.isBetterThan(state))
                state = childState;
            }
            parsed = parsed + matcher.parsed;
        }
        if(pos === -1)
            pos = 0;
        return new Matcher(state, pos, parsed);
    }
}

class SymbolSequence {
    readonly sequence: Sym[] = [];

    pos: number = 0;

    readonly parent: SymbolSequence | undefined;
    readonly parsedMatchers: Matcher[] = [];
    readonly production: Production | undefined;

    /**
     * Call it with all three parameter, with the not applicable ones set to undefined
     */
    constructor(start: Sym | undefined, parent: SymbolSequence | undefined, production: Production | undefined) {
        if(start !== undefined) {
            if(parent !== undefined || production !== undefined)
                throw new Error("If 'start' is defined, parent and production should be undefined");
            this.sequence.push(start);
            this.parent = undefined;
            this.production = undefined;
        }
        else {
            if(parent === undefined || production === undefined)
                throw new Error("If 'start' is not defined, parent and production should be defined");
            this.sequence.push(...parent.sequence);
            this.pos = parent.pos;
            this.parent = parent;
            this.production = production;
        }
    }

    getLastMatcher(): Matcher | undefined {
        return this.parsedMatchers.at(-1);
    }

    addMatcher(matcher: Matcher) {
        this.parsedMatchers.push(matcher);
    }

    getCurrentSymbol(): Sym {
        return this.sequence[this.pos];
    }

    replaceCurrentSymbol(production: Production): SymbolSequence {
        let copy: SymbolSequence = new SymbolSequence(undefined, this, production);
        copy.parsedMatchers.push(...this.parsedMatchers);
        copy.sequence.splice(this.pos, 1);
        let replacement: Sym[] = production.getRight();
        copy.sequence.splice(this.pos, 0, ...replacement);
        return copy;
    }

    incrementPosition(): void {
        this.pos++;
    }

    toString(): string {
        let ret: string = "";
        let i = 0;
        for(let sym of this.sequence) {
            if(i++ === this.pos)
                ret += "."
            ret += sym + " -- "
        }
        return ret;
    }
}

export { RDParser, SymbolSequence };
