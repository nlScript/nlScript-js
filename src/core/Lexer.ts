class Lexer {
    private readonly input: string;
    private pos: number = 0;
  
    constructor(input: string) {
      this.input = input;
    }
  
    getPosition(): number {
      return this.pos;
    }

    setPosition(pos: number): void {
      this.pos = pos;
    }

    fwd(len: number): void {
      this.pos += len;
    }
  
    peek(n: number = 0): string {
      let p: number = this.pos + n;
      return p < this.input.length ? this.input.charAt(p) : "$";
    }

    substring(from: number, to?: number): string {
      if (to !== undefined && to > this.input.length) {
        to = this.input.length;
      }
      return this.input.substring(from, to);
    }
  
    isDone(): boolean {
      return this.pos > this.input.length;
    }
  
    isAtEnd(fwd: number = 0): boolean {
      return this.pos + fwd === this.input.length;
    }
  
    toString(): string {
      return this.input.substring(0, this.pos) + " -- " + this.input.substring(this.pos);
    }
  }

  export { Lexer };
  