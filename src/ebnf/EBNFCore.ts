import { IfNothingYetEnteredAutocompleter } from "../Autocompleter.js";
import { Named } from "../core/Named.js";
import { BNF } from "../core/BNF.js";
import { NonTerminal } from "../core/NonTerminal.js";
import { Sym } from "../core/Symbol.js";
import { Terminal } from "../core/Terminal.js";
import { IntRange } from "../util/IntRange.js";
import { Join } from "./Join.js";
import { NamedRule } from "./NamedRule.js";
import { Optional } from "./Optional.js";
import { Or } from "./Or.js";
import { Plus } from "./Plus.js";
import { Repeat } from "./Repeat.js";
import { Rule } from "./Rule.js";
import { Sequence } from "./Sequence.js";
import { Star } from "./Star.js";
import { Evaluator } from "../Evaluator.js"
import { Autocompletion } from "../core/Autocompletion.js";
import { Production } from "../core/Production.js";

export class EBNFCore {

    protected readonly symbols: Map<string, Sym> = new Map();

    private readonly rules: Rule[] = [];

    private readonly bnf: BNF = new BNF();

    constructor(other?: EBNFCore) {
        if(other !== undefined) {
            for(let [key, value] of other.symbols)
                this.symbols.set(key, value);
            this.rules.push(...other.rules);
        }
    }

    getSymbol(type: string): Sym | undefined {
        return this.symbols.get(type);
    }

    compile(topLevelSymbol: Sym): void {
        // update the start symbol
        this.removeRules(BNF.ARTIFICIAL_START_SYMBOL);
        const sequence: Sequence = new Sequence(BNF.ARTIFICIAL_START_SYMBOL, topLevelSymbol, BNF.ARTIFICIAL_STOP_SYMBOL);
        this.addRule(sequence);
        sequence.setEvaluator(Evaluator.FIRST_CHILD_EVALUATOR);
    }

    getBNF(): BNF {
        return this.bnf;
    }

    getRules(target: NonTerminal): Rule[] {
        return this.rules.filter(p => p.getTarget().equals(target));
    }

    plus(type: string | undefined, child: Named<any>): Rule {
        const tgt: NonTerminal | undefined = this.newOrExistingNonTerminal(type);
        const plus: Plus = new Plus(tgt, child.getSymbol());
        plus.setParsedChildNames(child.getName());
        this.addRule(plus);
        return plus;
    }

    star(type: string | undefined, child: Named<any>): Rule {
        const tgt = this.newOrExistingNonTerminal(type);
        const star: Star = new Star(tgt, child.getSymbol());
        star.setParsedChildNames(child.getName());
        this.addRule(star);
        return star;
    }

    or(type: string | undefined, ...options: Named<any>[]): Rule {
        const tgt = this.newOrExistingNonTerminal(type);
        const or: Or = new Or(tgt, ...EBNFCore.getSymbols(...options));
        or.setParsedChildNames(...EBNFCore.getNames(...options));
        this.addRule(or);
        return or;
    }

    optional(type: string | undefined, child: Named<any>): Rule {
        const tgt = this.newOrExistingNonTerminal(type);
        const optional: Optional = new Optional(tgt, child.getSymbol());
        optional.setParsedChildNames(child.getName());
        this.addRule(optional);
        return optional;
    }

    repeat(type: string | undefined, child: Named<any>, from: number, to: number): Rule {
        const tgt = this.newOrExistingNonTerminal(type);
        const repeat: Repeat = new Repeat(tgt, child.getSymbol(), from, to);
        repeat.setParsedChildNames(child.getName());
        this.addRule(repeat);
        return repeat;
    }

    // TODO missing: repeat(type: string, child: Named, ...names: string[]): Rule {}

    join(type: string | undefined, child: Named<any>, open: Sym | undefined, close: Sym | undefined, delimiter: Sym | undefined, onlyKeepEntries: boolean, cardinality: IntRange): Rule;
    join(type: string | undefined, child: Named<any>, open: Sym | undefined, close: Sym | undefined, delimiter: Sym | undefined, onlyKeepEntries: boolean, names: string[]): Rule;
    join(type: string | undefined, child: Named<any>, open: Sym | undefined, close: Sym | undefined, delimiter: Sym | undefined, onlyKeepEntries: boolean, o: any): Rule {
        const tgt = this.newOrExistingNonTerminal(type);
        let cardinality: IntRange | undefined = undefined;
        let names: string[] | undefined = undefined;
        if(o instanceof IntRange) {
            names = [child.getName()];
            cardinality = o as IntRange;
        }
        else {
            names = o as string[];
            cardinality = new IntRange(names.length, names.length);
        }
        const join: Join = new Join(tgt, child.getSymbol(), open, close, delimiter, cardinality);
        join.setOnlyKeepEntries(onlyKeepEntries);
        join.setParsedChildNames(...names);
        this.addRule(join);
        return join;
    }

    list(type: string | undefined, child: Named<any>): Rule {
        const wsStar: NamedRule = this.star(undefined, Terminal.WHITESPACE.withName()).withName("ws*");
        const delimiter: Rule = this.sequence(undefined, wsStar, Terminal.literal(",").withName(), wsStar);
        delimiter.setAutocompleter(new IfNothingYetEnteredAutocompleter(", ", ""));
        return this.join(type, child, undefined, undefined, delimiter.getTarget(), true, IntRange.STAR);
    }

    tuple(type: string | undefined, child: Named<any>, ...names: string[]): Rule {
        const wsStar: NamedRule = this.star(undefined, Terminal.WHITESPACE.withName()).withName("ws*");
        wsStar.get().setAutocompleter((pn, _justCheck) => Autocompletion.literal(pn, [""]));
        const open: Rule      = this.sequence(undefined, Terminal.literal("(").withName("open"), wsStar);
        const close: Rule     = this.sequence(undefined, wsStar, Terminal.literal(")").withName("close"));
        const delimiter: Rule = this.sequence(undefined, wsStar, Terminal.literal(",").withName("delimiter"), wsStar);
        const ret: Rule = this.join(type, child, open.getTarget(), close.getTarget(), delimiter.getTarget(), true, names);
        ret.setAutocompleter((pn, justCheck) => {
            if(pn.getParsedString().length > 0)
                return undefined;
            if(justCheck)
                return Autocompletion.doesAutocomplete(pn);
            const seq: Autocompletion.EntireSequence = new Autocompletion.EntireSequence(pn);
            seq.addLiteral(open.getTarget(), "open", "(");
            seq.addParameterized(child.getSymbol(), names[0], names[0]);
            for(let i = 1; i < names.length; i++) {
                seq.addLiteral(delimiter.getTarget(), "delimiter", ", ");
                seq.addParameterized(child.getSymbol(), names[i], names[i]);
            }
            seq.addLiteral(close.getTarget(), "close", ")");
            return seq.asArray();
        });
        return ret;
    }

    sequence(type: string | undefined, ...children: Named<any>[]): Rule {
        const tgt: NonTerminal | undefined = this.newOrExistingNonTerminal(type);
        const sequence: Sequence = new Sequence(tgt, ...EBNFCore.getSymbols(...children));
        sequence.setParsedChildNames(...EBNFCore.getNames(...children));
        this.addRule(sequence);
        return sequence;
    }

    protected static getSymbols(...named: Named<any>[]): Sym[] {
        const ret: Sym[] = new Array(named.length);
        for(let i = 0; i < named.length; i++)
            ret[i] = named[i].getSymbol();
        return ret;
    }

    protected static getNames(...named: Named<any>[]): string[] {
        const ret: string[] = new Array(named.length);
        for(let i = 0; i < named.length; i++)
            ret[i] = named[i].getName();
        return ret;
    }

    private addRule(rule: Rule): void {
        let s: Sym = rule.getTarget();
        if(this.symbols.get(s.getSymbol()) === undefined)
            this.symbols.set(s.getSymbol(), s);

        for(let s of rule.getChildren()) {
            if(!s.isEpsilon() && this.symbols.get(s.getSymbol()) === undefined)
                this.symbols.set(s.getSymbol(), s);
        }
        this.rules.push(rule);
        rule.createBNF(this.bnf);
    }

    public removeRules(symbol: NonTerminal): void {
        // const toKeep:   Rule[] = this.rules.filter(r => !r.getTarget().equals(symbol));
        // const toRemove: Rule[] = this.rules.splice(
        //     0,
        //     this.rules.length,
        //     ...toKeep);
        // const productionsToRemove: Production[] = [];
        // toRemove.forEach(r => productionsToRemove.push(...r.getProductions()))

        // this.bnf.removeProductions(productionsToRemove);
        const toRemove: Production[] = [];
        for(let i = this.rules.length - 1; i >= 0; i--) {
            const r : Rule = this.rules[i];
            if(r.getTarget().equals(symbol)) {
                this.rules.splice(i, 1);
                toRemove.push(...r.getProductions());
            }
        }
        this.bnf.removeProductions(toRemove);
    }

    private newOrExistingNonTerminal(type: string | undefined): NonTerminal | undefined {
        if(type === undefined)
            return undefined;
        let s: Sym | undefined = this.symbols.get(type);
        if(s === undefined)
            s = new NonTerminal(type);
        return s as NonTerminal;
    }
}
