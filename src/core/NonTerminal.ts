import { BNF } from "./BNF";
import { Named } from "./Named";
import { Production } from "./Production";
import { Sym } from "./Symbol";

class NonTerminal extends Sym {

    constructor(symbol: string) {
        super(symbol);
    }

    override isTerminal(): boolean {
        return false;
    }

    override isNonTerminal(): boolean {
        return true;
    }

    override isEpsilon(): boolean {
        return false;
    }

    withName(name: string | undefined = undefined): Named<NonTerminal> {
        return new Named<NonTerminal>(this, name);
    }

    uses(symbol: Sym, bnf: BNF, progressing?: Set<string>): boolean {
        if(progressing === undefined)
            progressing = new Set<string>();
        const productions: Production[] = bnf.getProductions(this);
        for(const p of productions) {
            if(p.toString() in progressing)
                continue;
            progressing.add(p.toString());
            const rhs: Sym[] = p.getRight();
            for(const rSym of rhs) {
                if(rSym.equals(symbol))
                    return true;
                else if(rSym instanceof NonTerminal) {
                    if(rSym.uses(symbol, bnf, progressing))
                        return true;
                }
            }
        }
        return false;
    }

    override toString(): string {
        return "<" + this.getSymbol() + ">";
    }

    static makeRandomSymbol(): string {
        let length = 8;
        const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let result = '';
        for ( let i = 0; i < length; i++ )
            result += characters.charAt(Math.floor(Math.random() * charactersLength));

        return result;
    }
}

export { NonTerminal };