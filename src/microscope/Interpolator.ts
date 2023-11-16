
type Setter = (c: number, v: number) => void;
type Getter = () => number;

export class Interpolator {

    private readonly setter: Setter;

    private readonly getter: Getter;

    private vFrom: number;
    private readonly vTo: number;
    private readonly nCycles: number;

    constructor(getter: Getter, setter: Setter, vTo: number, nCycles: number) {
        this.getter = getter;
        this.setter = setter;
        this.vTo = vTo;
        this.nCycles = nCycles;
    }

    private initialize(): void {
        this.vFrom = this.getter();
    }

    interpolate(cycle: number): void {
        if(cycle === 0)
            this.initialize();
        const interpolated: number = this.vFrom + (cycle + 1) * (this.vTo - this.vFrom) / this.nCycles;
        this.setter(cycle, interpolated);
    }
}