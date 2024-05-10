import { Named } from './Named';
import { Lexer } from './Lexer';
import { Matcher } from './Matcher';
import { ParsingState } from './ParsingState';
import { Sym } from './Symbol';


abstract class Terminal extends Sym {

  static literal(s: string): Terminal {
    return new Literal(s);
  }

  static characterClass(pattern: string): Terminal {
    return new CharacterClass(pattern);
  }

  constructor(symbol: string) {
    super(symbol);
  }

  override isTerminal(): boolean {
    return true;
  }

  override isNonTerminal(): boolean {
    return false;
  }

  override isEpsilon(): boolean {
    return false;
  }

  abstract matches(lexer: Lexer): Matcher;

  abstract evaluate(matcher: Matcher): any;

  withName(name: string | undefined = undefined): Named<Terminal> {
    return new Named<Terminal>(this, name);
  }
}

class Epsilon extends Terminal {
  constructor() {
    super("epsilon");
  }

  override isEpsilon(): boolean {
    return true;
  }

  override matches(lexer: Lexer): Matcher {
    return new Matcher(ParsingState.SUCCESSFUL, lexer.getPosition(), "");
  }

  override evaluate(_matcher: Matcher) {
    return undefined;
  }
}

class EndOfInput extends Terminal {
  constructor() {
    super("EOI");
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    if (lexer.isAtEnd())
      return new Matcher(ParsingState.SUCCESSFUL, pos, " ");
    return new Matcher(ParsingState.FAILED, pos, "");
  }

  override evaluate(_matcher: Matcher) {
    return undefined;
  }
}

class Digit extends Terminal {
  constructor() {
    super("digit");
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    if (lexer.isAtEnd())
      return new Matcher(ParsingState.END_OF_INPUT, pos, "");
    const c = lexer.peek();
    if (c.match(/[0-9]/))
      return new Matcher(ParsingState.SUCCESSFUL, pos, c);
    return new Matcher(ParsingState.FAILED, pos, c);
  }

  override evaluate(matcher: Matcher) {
    return matcher.parsed.charAt(0);
  }
}

class Literal extends Terminal {
  constructor(symbol: string) {
    super(symbol);
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    const symbol = this.getSymbol();
    for (let i = 0; i < symbol.length; i++) {
      if (lexer.isAtEnd(i))
        return new Matcher(
          ParsingState.END_OF_INPUT,
          pos,
          lexer.substring(pos, pos + i + 1)
        );
      if (lexer.peek(i) !== symbol.charAt(i))
        return new Matcher(
          ParsingState.FAILED,
          pos,
          lexer.substring(pos, pos + i + 1)
        );
    }
    return new Matcher(ParsingState.SUCCESSFUL, pos, symbol);
  }

  override evaluate(matcher: Matcher) {
    return matcher.parsed;
  }

  override toString(): string {
    return `'${this.getSymbol()}'`;
  }
}

class Letter extends Terminal {
  constructor() {
    super("letter");
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    if (lexer.isAtEnd())
      return new Matcher(ParsingState.END_OF_INPUT, pos, "");
    const c = lexer.peek();
    console.debug("Test if " + c + " is a letter");
    if (c.match(/[a-zA-Z]/)) {
      console.debug("It is");
      return new Matcher(ParsingState.SUCCESSFUL, pos, c);
    }
    else {
      console.debug("it is not");
    }
    return new Matcher(ParsingState.FAILED, pos, c);
  }

  override evaluate(matcher: Matcher) {
    return matcher.parsed.charAt(0);
  }
}

class Whitespace extends Terminal {
  constructor() {
    super("whitespace");
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    if (lexer.isAtEnd())
      return new Matcher(ParsingState.END_OF_INPUT, pos, "");
    const c = lexer.peek();
    if (c === " " || c === "\t")
      return new Matcher(ParsingState.SUCCESSFUL, pos, c);
    return new Matcher(ParsingState.FAILED, pos, c);
  }

  override evaluate(matcher: Matcher) {
    return matcher.parsed.charAt(0);
  }
}

class CharacterClass extends Terminal {
  private ranges: Ranges;

  constructor(pattern: string) {
    super(pattern.trim());
    const b = pattern.trim();
    if (b.length === 0)
      throw new Error("empty character class pattern");
    if (b.charAt(0) !== "[" || b.charAt(b.length - 1) !== "]")
      throw new Error("Wrong character class format: " + pattern);

    let start = 1;
    let end = b.length - 2;

    const negated = b.charAt(1) === "^";
    if (negated)
      start++;

    this.ranges = new Ranges(negated);

    if (b.charAt(start) === "-") {
      this.ranges.add(new SingleCharacterRange('-'.charCodeAt(0)));
      start++;
    }
    if (b.charAt(end) === "-") {
      this.ranges.add(new SingleCharacterRange('-'.charCodeAt(0)));
      end--;
    }

    let idx = start;
    while (idx <= end) {
      const nIdx = idx + 1;
      const c = b.charAt(idx);
      if (nIdx <= end && b.charAt(nIdx) === "-") {
        const u = b.charAt(idx + 2);
        if (c === "-" || u === "-")
          throw new Error("Wrong character class format: " + pattern);
        this.ranges.add(new CharacterRange(c.charCodeAt(0), u.charCodeAt(0)));
        idx = idx + 3;
      } else {
        this.ranges.add(new SingleCharacterRange(c.charCodeAt(0)));
        idx++;
      }
    }
  }

  override matches(lexer: Lexer): Matcher {
    const pos = lexer.getPosition();
    if (lexer.isAtEnd())
      return new Matcher(ParsingState.END_OF_INPUT, pos, "");
    const c = lexer.peek();
    if (this.ranges.checkCharacter(c.charCodeAt(0)))
      return new Matcher(ParsingState.SUCCESSFUL, pos, c);
    return new Matcher(ParsingState.FAILED, pos, c);
  }

  override evaluate(matcher: Matcher) {
    return matcher.parsed.charAt(0);
  }

  override toString(): string {
    let ret: string = super.toString();
    // TODO ret = ret.replaceAll(/\n/gi, "\\n");
    return ret;
  }
}

class CharacterRange {
  readonly lower: number;
  readonly upper: number;

  constructor(lower: number, upper: number) {
    this.lower = lower;
    this.upper = upper;
  }

  checkCharacter(i: number): boolean {
    return i >= this.lower && i <= this.upper;
  }

  equals(o: any): boolean {
    if (!(o instanceof CharacterRange))
      return false;
    const c = o as CharacterRange;
    return this.lower === c.lower && this.upper === c.upper;
  }
}

class SingleCharacterRange extends CharacterRange {
  readonly number: number;

  constructor(number: number) {
    super(number, number);
    this.number = number;
  }

  override checkCharacter(i: number): boolean {
    return i === this.number;
  }
}

class Ranges {
  private readonly ranges: CharacterRange[] = [];
  private readonly negated: boolean = false;

  constructor(negated: boolean) {
    this.negated = negated;
  }

  add(range: CharacterRange) {
    this.ranges.push(range);
  }

  checkCharacter(i: number): boolean {
    for(var range of this.ranges) {
      let check = range.checkCharacter(i);
      if(!this.negated && check)
        return true;
      if(this.negated && check)
        return false;
    }
    return this.negated;
  }

  equals(o: any): boolean {
    if (!(o instanceof Ranges))
      return false;
    
    let sorter = (a: CharacterRange, b: CharacterRange) => {
      if(a.lower < b.lower) return -1;
      if(a.lower > b.lower) return 1;
      if(a.upper < b.upper) return -1;
      if(a.upper > b.upper) return 1;
      return 0;
    };
    
    let arr1 = this.ranges.slice();
    let arr2 =    o.ranges.slice();

    arr1.sort(sorter);
    arr2.sort(sorter);

    return arraysEqual(arr1, arr2);
  }
}

function arraysEqual(a: CharacterRange[], b: CharacterRange[]) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (!a[i].equals(b[i])) return false;
  }
  return true;
}

module Terminal {
  export const EPSILON:      Terminal = new Epsilon();
  export const DIGIT:        Terminal = new Digit();
  export const LETTER:       Terminal = new Letter();
  export const WHITESPACE:   Terminal = new Whitespace();
  export const END_OF_INPUT: Terminal = new EndOfInput();
}

export { Terminal, Literal, Epsilon, CharacterClass }
