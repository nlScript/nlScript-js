import { Sym } from "./Symbol";

export interface RepresentsSymbol {
    getRepresentedSymbol(): Sym;
}