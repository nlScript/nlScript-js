import { ParsedNode } from "../ParsedNode";
import { BNF } from "../core/BNF";
import { NonTerminal } from "../core/NonTerminal";
import { AstBuilder, Production } from "../core/Production";
import { Sym } from "../core/Symbol";
import { Terminal } from "../core/Terminal";
import { Evaluator } from "../Evaluator";
import { IntRange } from "../util/IntRange";
import { Repeat } from "./Repeat";
import { Rule } from "./Rule";
import { Star } from "./Star";

export class Join extends Rule {
    private readonly open: Sym | undefined;
    private readonly close: Sym | undefined;
    private readonly delimiter: Sym | undefined;
    private cardinality: IntRange;
    private onlyKeepEntries: boolean = true;

    constructor(tgt: NonTerminal | undefined, entry: Sym, open: Sym | undefined, close: Sym | undefined, delimiter: Sym | undefined, cardinality: IntRange) {
        super("join", tgt, entry);
        this.open = open;
        this.close = close;
        this.delimiter = delimiter;
        this.cardinality = cardinality;
        this.setEvaluator(Evaluator.ALL_CHILDREN_EVALUATOR);
    }

    getEntry(): Sym {
        return this.children[0];
    }

    getCardinality(): IntRange {
        return this.cardinality;
    }

    setCardinality(cardinality: IntRange): void {
        this.cardinality = cardinality;
    }

    setOnlyKeepEntries(onlyKeepEntries: boolean): void {
        this.onlyKeepEntries = onlyKeepEntries;
    }

    override createBNF(grammar: BNF): void {
        const first: Sym = this.children[0];
        const next: NonTerminal = new NonTerminal("next-" + NonTerminal.makeRandomSymbol());
        const hasOpen: boolean = this.open !== undefined && !this.open.isEpsilon();
        const hasClose: boolean = this.close !== undefined && !this.close.isEpsilon();
        const hasDelimiter: boolean = this.delimiter !== undefined && !this.delimiter.isEpsilon();

        if((hasOpen && !hasClose) || (!hasOpen && hasClose))
            throw new Error("Join must have either both open and close or neither");

        if(hasDelimiter) {
            const p: Production = Rule.addProduction(grammar, this, next, this.delimiter as Sym, first);
            const that = this;
            p.onExtension((parent, ...children) => {
                const nthEntry: number = (parent as ParsedNode).getNthEntryInParent() + 1;
                children[0].setName("delimiter");
                children[1].setName(that.getNameForChild(nthEntry));
            });

            if(this.onlyKeepEntries)
                p.setAstBuilder((parent, ...children) => parent.addChildren(children[1]));
            else
                p.setAstBuilder(AstBuilder.DEFAULT)
        }
        else {
            const p: Production = Rule.addProduction(grammar, this, next, first);
            const that = this;
            p.onExtension((parent, ...children) => {
                const nthEntry: number = (parent as ParsedNode).getNthEntryInParent() + 1;
                children[0].setName(that.getNameForChild(nthEntry));
            });
            p.setAstBuilder((parent, ...children) => parent.addChildren(children[0]));
        }

        // Assume L -> first next
        const astBuilder: AstBuilder = (parent, ...children) => {
            parent.addChildren(children[0]);
            for(let pn of children[1].getChildren())
                parent.addChildren(...pn.getChildren());
        };

        const repetition: NonTerminal = new NonTerminal("repetition:" + NonTerminal.makeRandomSymbol());

        // + : L -> first next*
        if(this.cardinality.equals(IntRange.PLUS)) {
            const star: Star = new Star(undefined, next);
            star.setParsedChildNames("next");
            star.createBNF(grammar);
            const p: Production = Rule.addProduction(grammar, this, repetition, first, star.getTarget());
            const that = this;
            p.onExtension((_parent, ...children) => {
                children[0].setName(that.getNameForChild(0));
                children[1].setName("star");
            });
            p.setAstBuilder(astBuilder);
        }

        // L -> first L
		// L -> next L
		// L -> e

		// * : L -> first next*
		//     L -> epsilon
		else if(this.cardinality.equals(IntRange.STAR)) {
            const star = new Star(undefined, next);
            star.setParsedChildNames("next");
            star.createBNF(grammar);

            const p1 = Rule.addProduction(grammar, this, repetition, first, star.getTarget());
            const p2 = Rule.addProduction(grammar, this, repetition, Terminal.EPSILON);
            p1.setAstBuilder(astBuilder);
            p2.setAstBuilder((_parent, ..._children) => {});

            const that = this;

            p1.onExtension((_parent, ...children) => {
                children[0].setName(that.getNameForChild(0))
                children[1].setName("star");
            });
        }

        // ? : L -> first
		//     L -> epsilon
		else if(this.cardinality.equals(IntRange.OPTIONAL)) {
			const p1: Production = Rule.addProduction(grammar, this, repetition, first); // using default ASTBuilder
            const that = this;
			p1.onExtension((_parent, ...children) => {
                children[0].setName(that.getNameForChild(0));
            });
			const p2: Production = Rule.addProduction(grammar, this, repetition, Terminal.EPSILON);
			p2.setAstBuilder((_parent, ..._children) => {});
		}

        // Dealing with a specific range
        else {
            const lower = this.cardinality.getLower();
            const upper = this.cardinality.getUpper();
            if(lower === 0 && upper === 0) {
                Rule.addProduction(grammar, this, repetition, Terminal.EPSILON).setAstBuilder((_parent, ..._children) => {});
            }
            else if(lower === 1 && upper === 1) {
                const p: Production = Rule.addProduction(grammar, this, repetition, first); // using default ASTBuilder
                const that = this;
                p.onExtension((_parent, ...children) => {
                    children[0].setName(that.getNameForChild(0));
                });
            }
            else {
                if(lower <= 0) {
                    const repeat: Repeat = new Repeat(undefined, next, 0, upper - 1);
                    repeat.setParsedChildNames("next");
                    repeat.createBNF(grammar);
                    const p = Rule.addProduction(grammar, this, repetition, first, repeat.getTarget());
                    const that = this;
                    p.setAstBuilder(astBuilder);
                    p.onExtension((_parent, ...children) => {
                        children[0].setName(that.getNameForChild(0));
                        children[1].setName("repeat");
                    });
                    Rule.addProduction(grammar, this, repetition, Terminal.EPSILON).setAstBuilder((_parent, ..._children) => {});
                }
                else {
                    const repeat: Repeat = new Repeat(undefined, next, lower - 1, upper - 1);
                    repeat.setParsedChildNames("next");
                    repeat.createBNF(grammar);
                    const p = Rule.addProduction(grammar, this, repetition, first, repeat.getTarget());
                    const that = this;
                    p.setAstBuilder(astBuilder);
                    p.onExtension((_parent, ...children) => {
                        children[0].setName(that.getNameForChild(0));
                        children[1].setName("repeat");
                    });
                }
            }
        }

        if(!hasOpen && !hasClose) {
            const p: Production = Rule.addProduction(grammar, this, this.tgt, repetition);
            p.onExtension((_parent, ...children) => {
                children[0].setName("repetition");
            });
            p.setAstBuilder((parent, ...children) => parent.addChildren(...children[0].getChildren()));
        }
        else {
            const p: Production = Rule.addProduction(grammar, this, this.tgt, this.open as Sym, repetition, this.close as Sym);
            const that = this;
            p.onExtension((_parent, ...children) => {
                if(!that.onlyKeepEntries)
                    children[0].setName("open");
                children[1].setName("repetition");
                if(!that.onlyKeepEntries)
                    children[2].setName("close");
            });
            p.setAstBuilder((parent, ...children) => {
                if(!that.onlyKeepEntries)
                    parent.addChildren(children[0]);
                parent.addChildren(...children[1].getChildren());
                if(!that.onlyKeepEntries)
                    parent.addChildren(children[2]);
            })
        }
    }
}