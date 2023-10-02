import { ParsingState } from './ParsingState';

class Matcher {

    readonly state: ParsingState;
    readonly pos: number;
    readonly parsed: string;

    constructor(state: ParsingState, pos: number, parsed: string) {
        this.state = state;
        this.pos = pos;
        this.parsed = parsed;
    }

    isBetterThan(o: Matcher | undefined): boolean {
        if(o === undefined || o === null)
            return true;
        if(this.state.isBetterThan(o.state))
            return true;
        if(o.state.isBetterThan(this.state))
            return false;
        let tParsedLength = this.pos + this.parsed.length;
        let oParsedLength = o.pos + o.parsed.length;
        return tParsedLength >= oParsedLength;
    }

    toString(): string {
        return `${this.state.toString()}: '${this.parsed}' (${this.pos})`;
    }
}

export { Matcher };