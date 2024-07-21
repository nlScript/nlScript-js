import { Rule } from "src/ebnf/Rule.js";
import { DefaultParsedNode } from "./DefaultParsedNode.js";
import { Sym } from "./Symbol.js";
import { ParsedNode } from "src/ParsedNode.js";
import { Named } from "./Named.js";

abstract class Autocompletion {
    public readonly symbolName: string;
    public readonly forSymbol: Sym;
    private alreadyEntered: string;

    constructor(pn: DefaultParsedNode);
    constructor(forSymbol: Sym, symbolName: string);
    constructor(pnOrForSymbol: DefaultParsedNode | Sym, symbolName?: string) {
        if(symbolName !== undefined) {
            this.forSymbol = pnOrForSymbol as Sym;
            this.symbolName = symbolName;
        } else {
            const pn: DefaultParsedNode = pnOrForSymbol as DefaultParsedNode;
            this.forSymbol = pn.getSymbol();
            this.symbolName = pn.getName();
        }
    }

    abstract getCompletion(purpose: Autocompletion.Purpose): string;

    isEmptyLiteral(): boolean {
        return (this instanceof Autocompletion.Literal) &&
            this.getCompletion(Autocompletion.Purpose.FOR_INSERTION).length == 0;
    }

    static literal(pn: DefaultParsedNode, literals: string[], prefix?: string, postfix?: string): Autocompletion[] {
        if(prefix === undefined)
            prefix = "";
        if(postfix === undefined)
            postfix = "";
        return literals.map((l: string) => new Autocompletion.Literal(pn, prefix + l + postfix));
    }

    static parameterized(pn: DefaultParsedNode, parameterName: string): Autocompletion[] {
        return new Autocompletion.Parameterized(pn, parameterName).asArray();
    }

    static veto(pn: DefaultParsedNode): Autocompletion[] {
        return new Autocompletion.Veto(pn).asArray();
    }

    static doesAutocomplete(pn: DefaultParsedNode): Autocompletion[] {
        return new Autocompletion.DoesAutocomplete(pn).asArray();
    }

    getAlreadyEntered(): string {
        return this.alreadyEntered;
    }

    setAlreadyEntered(alreadyEntered: string): void {
        this.alreadyEntered = alreadyEntered;
    }

    asArray(): Autocompletion[] {
        return [this];
    }
}

module Autocompletion {

    export class Literal extends Autocompletion {
        private readonly literal: string;

        constructor(pn: DefaultParsedNode, s: string);
        constructor(forSymbol: Sym, symbolName: string, s: string);
        constructor(pnOrForSymbol: DefaultParsedNode | Sym, sOrSymbolName: string, s?:string) {
            if(s !== undefined) {
                super(pnOrForSymbol as Sym, sOrSymbolName);
                this.literal = s;
            }
            else {
                super(pnOrForSymbol as DefaultParsedNode);
                this.literal = sOrSymbolName as string;
            }
        }

        override getCompletion(_purpose: Purpose): string {
            return this.literal;
        }
    }

    export class Parameterized extends Autocompletion {
        private readonly paramName: string;

        constructor(pn: DefaultParsedNode, paramName: string);
        constructor(forSymbol: Sym, symbolName: string, paramName: string);
        constructor(pnOrForSymbol: DefaultParsedNode | Sym, paramNameOrSymbolName: string, paramName?: string) {
            if(paramName !== undefined) {
                super(pnOrForSymbol as Sym, paramNameOrSymbolName);
                this.paramName = paramName;
            } else {
                super(pnOrForSymbol as DefaultParsedNode);
                this.paramName = paramNameOrSymbolName;
            }
        }

        override getCompletion(_purpose: Purpose): string {
            return "${" + this.paramName + "}";
        }

        getParamName(): string {
            return this.paramName;
        }
    }

    export class Veto extends Autocompletion {

        public static readonly VETO: string = "VETO";

        override getCompletion(_purpose: Purpose): string {
            return Veto.VETO;
        }
    }

    export class DoesAutocomplete extends Autocompletion {
        override getCompletion(_purpose: Purpose): string {
            return "Something"; // the return value for DoesAutocomplete shouldn't matter
        }
    }

    export class EntireSequence extends Autocompletion {

        private readonly sequenceOfCompletions: Autocompletion[][];

        private readonly sequence: Rule;

        constructor(pn: DefaultParsedNode);
        constructor(forSymbol: Sym, symbolName: string, sequence: Rule);
        constructor(pnOrForSymbol: DefaultParsedNode | Sym, symbolName?: string, sequence?: Rule) {
            if(symbolName !== undefined && sequence != undefined) {
                super(pnOrForSymbol as Sym, symbolName as string);
                this.sequence = sequence;
            }
            else {
                super(pnOrForSymbol as DefaultParsedNode);
                this.sequence = (pnOrForSymbol as ParsedNode).getRule() as Rule;
            }
            this.sequenceOfCompletions = [];
        }

        add(completions: Autocompletion[]): void {
            this.sequenceOfCompletions.push(completions);
        }

        getSequenceOfCompletions(): Autocompletion[][] {
            return this.sequenceOfCompletions;
        }

        getSequence(): Rule {
            return this.sequence;
        }

        addLiteral(symbol: Sym, name: string, completion: string): void {
            this.add([new Literal(symbol, name, completion)]);
        }

        addParameterized(symbol: Sym, name: string, parameter: string) : void {
            this.add([new Parameterized(symbol, name, parameter)]);
        }

        override getCompletion(purpose: Purpose): string {
            let autocompletionString: string = "";
            for(let i:number = 0; i < this.sequenceOfCompletions.length; i++) {
                const autocompletions: Autocompletion[] = this.sequenceOfCompletions[i];
                const n = autocompletions.length;
                if(n > 1)
                    autocompletionString += "${" + this.sequence.getNameForChild(i) + "}";
                else if(n == 1) {
                    if(purpose === Purpose.FOR_MENU) {
                        let ins: string;
                        const ac: Autocompletion = autocompletions[0];
                        if(ac instanceof Literal)
                            ins = ac.getCompletion(Purpose.FOR_INSERTION);
                        else
                            ins = "${" + this.sequence.getNameForChild(i) + "}";
                        if(ins === undefined || ins === Named.UNNAMED) 
                            ins = "${" + this.sequence.getChildren()[i].getSymbol() + "}";
                        
                        autocompletionString += ins;
                    }
                    else if(purpose === Purpose.FOR_INSERTION)
                        autocompletionString += autocompletions[0].getCompletion(purpose);
                }
            }
            return autocompletionString;
        }
    }

    export enum Purpose {
        FOR_MENU,
        FOR_INSERTION
    }
}

export { Autocompletion }
