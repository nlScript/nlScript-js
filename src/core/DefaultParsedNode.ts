import { Literal } from "./Terminal";
import { Matcher } from "./Matcher";
import { Production } from "./Production";
import { Sym } from "./Symbol";
import { Autocompleter } from "../Autocompleter";
import { Named } from "./Named";

class DefaultParsedNode {

    private parent: DefaultParsedNode | undefined = undefined;
    private readonly children: DefaultParsedNode[] = [];

    private readonly symbol: Sym;
    private readonly production: Production | undefined;
    private readonly matcher: Matcher;
    
    private name: string | undefined;

    constructor(matcher: Matcher, symbol: Sym, production: Production | undefined) {
        this.matcher = matcher;
		this.symbol = symbol;
		this.production = production;
    }

    getSymbol(): Sym {
        return this.symbol;
    }

    getName(): string {
        return this.name !== undefined ? this.name : this.symbol.getSymbol();
    }

    setName(name: string | undefined): void {
        this.name = name;
    }

    getProduction(): Production | undefined {
        return this.production;
    }

    getMatcher(): Matcher {
        return this.matcher;
    }

    doesAutocomplete(): boolean {
        let autocompletion: string | undefined = this.getAutocompletion();
        return autocompletion !== null && autocompletion !== undefined;
    }

    getAutocompletion(): string | undefined {
        if(this.symbol === null || this.symbol === undefined)
            return undefined;
        
        if(this.symbol instanceof Literal)
            return this.symbol.getSymbol();
        
        let name: string = this.getName();
        if(name === Named.UNNAMED)
            name = this.symbol.getSymbol();

        if(this.symbol.isTerminal()) {
            return this.getParsedString().length > 0 ? Autocompleter.VETO : "${" + name + "}";
        }
        return undefined;
    }

    numChildren(): number {
        return this.children.length;
    }

    getChildren(): DefaultParsedNode[] {
        return this.children;
    }

    getChild(index: number): DefaultParsedNode;
    getChild(name: string): DefaultParsedNode;
    getChild(n: any): DefaultParsedNode | undefined {
        if(typeof(n) === 'number') {
            return this.children[n as number];
        }
        else if(typeof(n) === 'string') {
            return this.children.find((value: DefaultParsedNode) => value.getName() === n);
        }
        return undefined;
    }

    addChildren(...children: DefaultParsedNode[]): void {
        this.children.push(...children);
        for(let child of children)
            child.parent = this;
    }

    getParent(): DefaultParsedNode | undefined {
        return this.parent;
    }

    removeAllChildren(): void {
        for(let child of this.children)
            child.parent = undefined;
        this.children.length = 0;
    }

    evaluate(n: number): any;

    evaluate(...n: string[]): any;

    evaluate(...n: any): any {
        if(n.length === 0)
            return this.getParsedString();

        if(typeof(n[0]) === 'number')
            return this.children[n].evaluate();
        
        if(typeof(n[0]) === 'string') {
            let pn: DefaultParsedNode = this;
            for(let name of n) {
                pn = pn.getChild(name);
                if(pn === null || pn === undefined)
                    return undefined;
            }
            return pn.evaluate();
        }
        
        return undefined;
    }

    getParsedString(...names: string[]): string {
        let pn: DefaultParsedNode = this;
        for(let name of names) {
            pn = pn.getChild(name);
            if(pn === undefined)
                return "";
        }
        return pn.getMatcher().parsed;
    }

    toString(): string {
        return this.getMatcher().parsed;
    }
}

export { DefaultParsedNode };