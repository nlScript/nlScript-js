import { Terminal } from "./Terminal.js";
import { NonTerminal } from "./NonTerminal.js";
import { Production } from "./Production.js";
import { Sym } from "./Symbol.js";

class BNF {
    static readonly ARTIFICIAL_START_SYMBOL: NonTerminal = new NonTerminal("S'");
    static readonly ARTIFICIAL_STOP_SYMBOL:  Terminal    = Terminal.END_OF_INPUT;

    readonly symbols: Map<string, Sym> = new Map();
    readonly productions: Production[] = [];

    constructor(other?: BNF) {
        if(other !== undefined) {
            for(let [key, value] of other.symbols)
                this.symbols.set(key, value);
            this.productions.push(...other.productions);
        }
    }

    reset(): void {
        this.symbols.clear();
        this.productions.length = 0;
    }

    removeStartProduction(): void {
        var i = this.productions.length;
        while (i--) {
            if (this.productions[i].getLeft().equals(BNF.ARTIFICIAL_START_SYMBOL)) {
                this.productions.splice(i, 1);
                break;
            }
        }
    }

    addProduction(p: Production): Production {
        let existing: number = this.productions.findIndex(v => v.equals(p));
        if(existing != -1) {
            console.log("Production already exists: " + p);
            return this.productions[existing];
        }
        this.productions.push(p);
        this.symbols.set(p.getLeft().getSymbol(), p.getLeft());
        for(let sym of p.getRight()) {
            if(!sym.isEpsilon())
                this.symbols.set(sym.getSymbol(), sym);
        }
        return p;
    }

    getSymbol(symbol: string): Sym {
        let ret: Sym | undefined = this.symbols.get(symbol);
        if(ret === undefined)
            throw new Error("Could not find symbol " + symbol);
        return ret;
    }

    getProductions(left: NonTerminal): Production[] {
        return this.productions.filter(p => p.getLeft().equals(left));
    }

    toString(): string {
        let ret: string = "";
        for(let p of this.productions) {
            ret += p.toString() + "\n";
        }
        return ret;
    }

}

export { BNF };