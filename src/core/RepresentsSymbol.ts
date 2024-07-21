import { Sym } from "./Symbol.js";

export interface RepresentsSymbol {
    getRepresentedSymbol(): Sym;
}