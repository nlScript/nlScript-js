import { Autocompleter } from "../Autocompleter";
import { Autocompletion } from "./Autocompletion";
import { ParsedNodeFactory } from "./ParsedNodeFactory";
import { BNF } from "./BNF";
import { DefaultParsedNode } from "./DefaultParsedNode";
import { Lexer } from "./Lexer";
import { Matcher } from "./Matcher";
import { NonTerminal } from "./NonTerminal";
import { ParsingState } from "./ParsingState";
import { Production } from "./Production";
import { Sym } from "./Symbol";
import { Terminal } from "./Terminal";
import { ParseException } from "../ParseException";

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
        if(autocompletions !== undefined && autocompletions.length > 0 && autocompletions.at(-1) === undefined)
            autocompletions.splice(autocompletions.length - 1, 1);
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
        for(const seq of endOfInput) {
            this.addAutocompletions(seq, autocompletions);
        }
    }

    private addAutocompletions(symbolSequence: SymbolSequence, autocompletions: Array<Autocompletion | undefined>): void {
        if(autocompletions === null || autocompletions === undefined)
            throw new Error("autocompletions should be defined at this point");
        
        if(autocompletions.length > 0 && autocompletions.at(-1) === undefined)
            return;
        
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
        if(autocompletingParent === undefined)
            return;
        
        let autocompletingParentStart: number = autocompletingParent.getMatcher().pos;
        let alreadyEntered: string = this.lexer.substring(autocompletingParentStart);
        let completion: string | undefined = autocompletingParent.getAutocompletion();
        if(completion !== undefined && completion.length > 0) {
            for(let c of completion.split(";;;")) {
                if(c === Autocompleter.VETO) {
                    autocompletions.push(undefined); // to prevent further autocompletion
                    return;
                }
                let ac = new Autocompletion(c, alreadyEntered);
                if(!autocompletions.find(existing => existing?.equals(ac)))
                    autocompletions.push(ac);
            }
        }
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
					: new Matcher(ParsingState.NOT_PARSED, 0, "");

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
        const pos = children.length > 0 ? children[0].getMatcher().pos : 0;
        let state = ParsingState.NOT_PARSED;
        let parsed = "";
        for(let child of children) {
            // already encountered EOI or FAILED before, do nothing
            if(state.equals(ParsingState.END_OF_INPUT) || state.equals(ParsingState.FAILED))
                break;
            
            const matcher = child.getMatcher();
            const childState = matcher.state;
            if(!childState.equals(ParsingState.NOT_PARSED)) {
                if(state.equals(ParsingState.NOT_PARSED) || !childState.isBetterThan(state))
                state = childState;
            }
            parsed = parsed + matcher.parsed;
        }
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
            if(i++ == this.pos)
                ret += "."
            ret += sym + " -- "
        }
        return ret;
    }
}

export { RDParser, SymbolSequence };