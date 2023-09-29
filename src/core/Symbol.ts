import { RepresentsSymbol } from "./RepresentsSymbol";

abstract class Sym implements RepresentsSymbol{
    
    private readonly symbol: string;

    constructor(symbol: string) {
        this.symbol = symbol;
    }

    getSymbol(): string {
        return this.symbol;
    }

    getRepresentedSymbol(): Sym {
        return this;
    }

    abstract isTerminal(): boolean;

    abstract isNonTerminal(): boolean;

    abstract isEpsilon(): boolean;

    toString(): string {
        return this.symbol;
    }

    equals(o: any): boolean {
        if (!(o instanceof Sym))
            return false;
        return this.symbol === o.symbol;
    }
}

export { Sym };
