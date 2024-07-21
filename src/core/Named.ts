import { RepresentsSymbol } from "./RepresentsSymbol.js";
import { Sym } from "./Symbol.js";

export class Named<T extends RepresentsSymbol> {

    public static readonly UNNAMED: string = "UNNAMED";

    readonly name: string;

    readonly object: T;

    constructor(object: T, name: string | undefined = undefined) {
        this.object = object;
        this.name = name !== undefined ? name : Named.UNNAMED;
    }

    getName(): string {
        return this.name;
    }

    get(): T {
        return this.object;
    }

    getSymbol(): Sym {
        return this.object.getRepresentedSymbol();
    }
}