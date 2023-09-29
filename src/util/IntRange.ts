class IntRange {

    static readonly MAX_INT = 2147483647;

    static readonly STAR:     IntRange = new IntRange(0, IntRange.MAX_INT);
    static readonly PLUS:     IntRange = new IntRange(1, IntRange.MAX_INT);
    static readonly OPTIONAL: IntRange = new IntRange(0, 1);
    
    private readonly lower: number;
    private readonly upper: number;

    constructor(lower: number, upper?: number) {
        this.lower = lower;
        this.upper = upper !== undefined ? upper : lower;
    }

    getLower(): number {
        return this.lower;
    }

    getUpper(): number {
        return this.upper;
    }

    equals(o: any): boolean {
        if(!(o instanceof IntRange))
            return false;
        const r = o as IntRange;
        return this.lower === r.lower && this.upper === r.upper;
    }

    toString(): string {
        return "[" + this.lower + " - " + this.upper + "]";
    }
}

export { IntRange }