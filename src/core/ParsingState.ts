class ParsingState {

    static readonly SUCCESSFUL:   ParsingState = new ParsingState(0, 'SUCCESSFUL');
    static readonly END_OF_INPUT: ParsingState = new ParsingState(1, 'END_OF_INPUT');
    static readonly FAILED:       ParsingState = new ParsingState(2, 'FAILED');
    static readonly NOT_PARSED:   ParsingState = new ParsingState(3, 'NOT_PARSED');

    readonly ordinal: number;
    readonly label: string;

    constructor(ordinal: number, label: string) {
        this.ordinal = ordinal;
        this.label = label;
    }

    isBetterThan(o: ParsingState): boolean {
      return this.ordinal < o.ordinal
    }

    toString() {
        return this.label;
    }

    equals(o: any): boolean {
      if(!(o instanceof ParsingState))
        return false;
      return this.ordinal === (o as ParsingState).ordinal;
    }
  }
  
  export { ParsingState };
  