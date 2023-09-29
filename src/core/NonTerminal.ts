import { Named } from "./Named";
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