import { ParsedNode } from "./ParsedNode";
import { Autocompleter, EntireSequenceCompleter } from "./Autocompleter";
import { Autocompletion } from "./core/Autocompletion";
import { Named } from "./core/Named";
import { DefaultParsedNode } from "./core/DefaultParsedNode";
import { Lexer } from "./core/Lexer";
import { NonTerminal } from "./core/NonTerminal";
import { ParsingState } from "./core/ParsingState";
import { RDParser } from "./core/RDParser";
import { Sym } from "./core/Symbol";
import { Terminal } from "./core/Terminal";
import { EBNF } from "./ebnf/EBNF";
import { EBNFParsedNodeFactory } from "./ebnf/EBNFParsedNodeFactory";
import { EBNFParser, ParseStartListener } from "./ebnf/EBNFParser";
import { NamedRule } from "./ebnf/NamedRule";
import { Rule } from "./ebnf/Rule";
import { Evaluator } from "./Evaluator";
import { IntRange } from "./util/IntRange";
import { BNF } from "./core/BNF";
import { Join } from "./ebnf/Join";

export class Parser {

    private readonly grammar: EBNF = new EBNF();

    private readonly LINEBREAK = Terminal.literal("\n");

    readonly QUANTIFIER     : Rule;
    readonly IDENTIFIER     : Rule;
	readonly VARIABLE_NAME  : Rule;
	readonly ENTRY_NAME     : Rule;
	readonly LIST           : Rule;
	readonly TUPLE          : Rule;
	readonly CHARACTER_CLASS: Rule;
	readonly TYPE           : Rule;
	readonly VARIABLE       : Rule;
	readonly NO_VARIABLE    : Rule;
	readonly EXPRESSION     : Rule;

	private readonly LINEBREAK_STAR: Rule;

	private readonly targetGrammar: EBNF = new EBNF();

    private readonly symbol2Autocompletion: Map<String, String> = new Map<String, String>();

    private compiled: boolean = false;

    constructor() {
        this.QUANTIFIER      = this.quantifier();
		this.IDENTIFIER      = this.identifier("identifier");
		this.VARIABLE_NAME   = this.variableName();
		this.ENTRY_NAME      = this.entryName();
		this.LIST            = this.list();
		this.TUPLE           = this.tuple();
		this.CHARACTER_CLASS = this.characterClass();
		this.TYPE            = this.type();
		this.VARIABLE        = this.variable();
		this.NO_VARIABLE     = this.noVariable();
		this.EXPRESSION      = this.expression();

		this.LINEBREAK_STAR = this.targetGrammar.star("linebreak-star", this.LINEBREAK.withName());
		this.program();
    }

    getGrammar(): EBNF {
        return this.grammar;
    }

    getTargetGrammar(): EBNF {
        return this.targetGrammar;
    }

    defineSentence(pattern: string, evaluator: Evaluator | undefined): NamedRule;
    defineSentence(pattern: string, evaluator: Evaluator | undefined, autocompleter: Autocompleter): NamedRule;
    defineSentence(pattern: string, evaluator: Evaluator | undefined, completeEntireSequence: boolean): NamedRule;

    defineSentence(pattern: string, evaluator: Evaluator | undefined, howToComplete?: Autocompleter | boolean): NamedRule {
        let autocompleter: Autocompleter | undefined;
        if(howToComplete === undefined)
            autocompleter = undefined;
        else if(typeof howToComplete === 'boolean')
            autocompleter = howToComplete
                ? new EntireSequenceCompleter(this.targetGrammar, this.symbol2Autocompletion)
                : Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER;
        else
            autocompleter = howToComplete;
        return this.defineType("sentence", pattern, evaluator, autocompleter);
    }

    defineType(type: string, pattern: string, evaluator: Evaluator | undefined): NamedRule;
    defineType(type: string, pattern: string, evaluator: Evaluator | undefined, autocompleter: Autocompleter | undefined): NamedRule;
    defineType(type: string, pattern: string, evaluator: Evaluator | undefined, completeEntireSequence: boolean): NamedRule;

    defineType(type: string, pattern: string, evaluator: Evaluator | undefined, howToComplete?: Autocompleter | boolean): NamedRule {
        let autocompleter: Autocompleter | undefined;
        if(howToComplete === undefined)
            autocompleter = undefined;
        else if(typeof howToComplete === 'boolean')
            autocompleter = howToComplete
                ? new EntireSequenceCompleter(this.targetGrammar, this.symbol2Autocompletion)
                : Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER;
        else
            autocompleter = howToComplete;
        
        this.grammar.compile(this.EXPRESSION.getTarget());
        const parser: RDParser = new RDParser(this.grammar.getBNF(), new Lexer(pattern), EBNFParsedNodeFactory.INSTANCE);
        let pn: DefaultParsedNode = parser.parse();
        if(!pn.getMatcher().state.equals(ParsingState.SUCCESSFUL))
            throw new Error("Parsing failed");
        
        const rhs: Named<any>[] = pn.evaluate();

        const newRule: Rule = this.targetGrammar.sequence(type, ...rhs);
        if(evaluator !== undefined)
            newRule.setEvaluator(evaluator);
        if(autocompleter !== undefined)
            newRule.setAutocompleter(autocompleter);
        
        return newRule.withName(type);
    }

    compile(symbol?: Sym): void {
        if(symbol === undefined)
            symbol = this.targetGrammar.getSymbol("program");
        this.targetGrammar.compile(symbol as Sym);
        this.compiled = true;
    }

    parse(text: string, autocompletions?: Autocompletion[]): ParsedNode {
        if(!this.compiled)
            this.compile();
        
        this.symbol2Autocompletion.clear();
		const grammar: BNF = this.targetGrammar.getBNF();
        const rdParser: EBNFParser = new EBNFParser(grammar, new Lexer(text));
        rdParser.addParseStartListener(() => this.fireParsingStarted());
        return rdParser.parse(autocompletions) as ParsedNode;
    }

    private quantifier(): Rule {
        const g: EBNF = this.grammar;
        return g.or("quantifier",
            g.sequence(undefined, Terminal.literal("?").withName()).       setEvaluator(_pn => IntRange.OPTIONAL).           withName("optional"),
            g.sequence(undefined, Terminal.literal("+").withName()).       setEvaluator(_pn => IntRange.PLUS).               withName("plus"),
            g.sequence(undefined, Terminal.literal("*").withName()).       setEvaluator(_pn => IntRange.STAR).               withName("star"),
            g.sequence(undefined,       g.INTEGER_RANGE.withName("range")).setEvaluator( pn => pn.evaluate(0)).              withName("range"),
            g.sequence(undefined,             g.INTEGER.withName("int")).  setEvaluator( pn => new IntRange(pn.evaluate(0))).withName("fixed"))
    }

    /**
	 * [A-Za-z_] ([A-Za-z0-9-_]* [A-Za-z0-9_])?
	 *
	 * Start:  letter or underscore
	 * Middle: letter or underscore or dash or digit
	 * End:    letter or underscore or digit
	 *
	 */
    private identifier(name: string): Rule {
        if(name === undefined)
            name = "identifier";
        const g: EBNF = this.grammar;
        return g.sequence(name,
            Terminal.characterClass("[A-Za-z_]").withName(),
            g.optional(undefined,
                g.sequence(undefined,
                    g.star(undefined,
                        Terminal.characterClass("[A-Za-z0-9_-]").withName()
                    ).withName("star"),
					Terminal.characterClass("[A-Za-z0-9_]").withName()
                ).withName("seq")
            ).withName("opt")
        );
    }

    /**
	 * (was: ExtendedName)
	 *
	 * [^:{}\n]+
	 *
	 * Everything but ':', '{', '}'
	 */
	private variableName(): Rule {
		return this.grammar.plus("var-name",
				Terminal.characterClass("[^:{}]").withName()).setEvaluator(Evaluator.DEFAULT_EVALUATOR);
	}

	private entryName(): Rule {
		return this.identifier("entry-name");
	}

	// evaluates to the target grammar's list rule (i.e. Join).
    private list(): Rule {
        const g: EBNF = this.grammar;
		return g.sequence("list",
				Terminal.literal("list").withName(),
				g.WHITESPACE_STAR.withName("ws*"),
				Terminal.literal("<").withName(),
				g.WHITESPACE_STAR.withName("ws*"),
				this.IDENTIFIER.withName("type"),
				g.WHITESPACE_STAR.withName("ws*"),
				Terminal.literal(">").withName()
		).setEvaluator(pn => {
			const identifier: string = pn.evaluate("type") as string;
			const entry: Sym | undefined = this.targetGrammar.getSymbol(identifier);
			if(entry === undefined)
				throw new Error("Could not find " + identifier + " in the target grammar.");

			const namedEntry: Named<any> = (entry instanceof Terminal)
					? (entry as Terminal).withName(identifier)
					: (entry as NonTerminal).withName(identifier);
			return this.targetGrammar.list(undefined, namedEntry);
        });
	}

    private tuple(): Rule {
        const g: EBNF = this.grammar;
		return g.sequence("tuple",
				Terminal.literal("tuple").withName(),
				g.WHITESPACE_STAR.withName("ws*"),
				Terminal.literal("<").withName(),
				g.WHITESPACE_STAR.withName("ws*"),
				this.IDENTIFIER.withName("type"),
				g.plus(undefined,
						g.sequence(undefined,
								g.WHITESPACE_STAR.withName("ws*"),
								Terminal.literal(",").withName(),
								g.WHITESPACE_STAR.withName("ws*"),
								this.ENTRY_NAME.withName("entry-name"),
								g.WHITESPACE_STAR.withName("ws*")
						).withName("sequence-names")
				).withName("plus-names"),
				Terminal.literal(">").withName()
		).setEvaluator(pn => {
			const type: string = pn.evaluate("type") as string;
			const plus: DefaultParsedNode = pn.getChild("plus-names");
			const nTuple: number = plus.numChildren();
			const entryNames: string[] = new Array<string>(nTuple);
			for(let i = 0; i < nTuple; i++)
				entryNames[i] = plus.getChild(i).evaluate("entry-name") as string;

			const entry: Sym | undefined = this.targetGrammar.getSymbol(type);
			if(entry === undefined)
				throw new Error("Could not find " + type + " in the target grammar.");
			
			const namedEntry: Named<any> = (entry instanceof Terminal)
					? (entry as Terminal).withName()
					: (entry as NonTerminal).withName();

			return this.targetGrammar.tuple(undefined, namedEntry, ...entryNames).getTarget();
		});
	}

    private characterClass(): Rule {
		return this.grammar.sequence("character-class",
				Terminal.literal("[").withName(),
				this.grammar.plus(undefined,
					this.grammar.or(undefined,
						Terminal.characterClass("[^]]").withName(),
						Terminal.literal("\\]").withName()
					).withName()
				).withName("plus"),
				Terminal.literal("]").withName()
		).setEvaluator(pn => {
			const pattern: string = pn.getParsedString();
			return Terminal.characterClass(pattern);
		});
	}

    private type(): Rule {
        const g: EBNF = this.grammar;
		return g.or("type",
				g.sequence(undefined,
						this.IDENTIFIER.withName("identifier")
				).setEvaluator(pn => {
					const str: string = pn.getParsedString();
					const symbol: Sym | undefined = this.targetGrammar.getSymbol(str);
					if(symbol === undefined)
						throw new Error("Unknown type '" + str + "'");
					return symbol;
				}).withName("type"),
				this.LIST.withName("list"),
				this.TUPLE.withName("tuple"),
				this.CHARACTER_CLASS.withName("character-class")
		);
	}

    /*
	 * {name:[:type][:quantifier]}
	 * - either just the name: {From frame}
	 * - or name and type: {frame:int}
	 */
	private variable(): Rule {
        const g: EBNF = this.grammar;
		return g.sequence("variable",
				Terminal.literal("{").withName(),
				this.VARIABLE_NAME.withName("variable-name"),
				g.optional(undefined,
						g.sequence(undefined,
								Terminal.literal(":").withName(),
								this.TYPE.withName("type")
						).withName("seq-type")
				).withName("opt-type"),
				g.optional(undefined,
						g.sequence(undefined,
								Terminal.literal(":").withName(),
								this.QUANTIFIER.withName("quantifier")
						).withName("seq-quantifier")
				).withName("opt-quantifier"),
				Terminal.literal("}").withName()
		).setEvaluator(pn => {
			const variableName: string = pn.evaluate("variable-name") as string;
			const typeObject: any = pn.evaluate("opt-type", "seq-type", "type");
			const quantifierObject: any = pn.evaluate("opt-quantifier", "seq-quantifier", "quantifier");

			// typeObject is either
			// - a type (symbol) from the target grammar, or
			// - a character-class (i.e. a terminal), or
			// - a tuple (i.e. symbol of the tuple in the target grammar), or
			// - a list (i.e. a Rule, or more specifically a Join).
			if(typeObject instanceof Join) {
				const join: Join = typeObject as Join;
				if(quantifierObject != null)
					join.setCardinality(quantifierObject as IntRange);
				return join.getTarget().withName(variableName);
			}


			let symbol: Sym = typeObject === undefined
					? Terminal.literal(variableName)
					: typeObject as Sym;

			let namedSymbol: Named<any> = (symbol instanceof Terminal)
					? (symbol as Terminal).withName(variableName)
					: (symbol as NonTerminal).withName(variableName);

			if(quantifierObject !== undefined) {
				const range: IntRange = quantifierObject as IntRange;
				     if(range.equals(IntRange.STAR))     symbol = this.targetGrammar.star(    undefined, namedSymbol).getTarget();
				else if(range.equals(IntRange.PLUS))     symbol = this.targetGrammar.plus(    undefined, namedSymbol).getTarget();
				else if(range.equals(IntRange.OPTIONAL)) symbol = this.targetGrammar.optional(undefined, namedSymbol).getTarget();
				else                                     symbol = this.targetGrammar.repeat(  undefined, namedSymbol, range.getLower(), range.getUpper()).getTarget();
				
                namedSymbol = (symbol as NonTerminal).withName(variableName);
			}
			return namedSymbol;
		});
	}

    private noVariable(): Rule {
        const g: EBNF = this.grammar;
		return g.sequence("no-variable",
				Terminal.characterClass("[^ \t\n{]").withName(),
				g.optional(undefined,
						g.sequence(undefined,
								g.star(undefined,
										Terminal.characterClass("[^{\n]").withName()
								).withName("middle"),
								Terminal.characterClass("[^ \t\n{]").withName()
						).withName("seq")
				).withName("tail")
		).setEvaluator(pn => Terminal.literal(pn.getParsedString()).withName());
	}

    private expression(): Rule {
        const g: EBNF = this.grammar;
		return g.join("expression",
				g.or(undefined,
						this.NO_VARIABLE.withName("no-variable"),
						this.VARIABLE.withName("variable")
				).withName("or"),
				undefined,
				undefined,
				g.WHITESPACE_STAR.getTarget(),
				false,
				IntRange.PLUS
		).setEvaluator(parsedNode => {
			const nChildren: number = parsedNode.numChildren();

            const rhsList: Named<any>[] = [];

			rhsList.push(parsedNode.evaluate(0) as Named<any>);
			for(let i = 1; i < nChildren; i++) {
				const child: DefaultParsedNode = parsedNode.getChild(i);
				if(i % 2 == 0) { // or
					rhsList.push(child.evaluate() as Named<any>);
				}
				else { // ws*
					const hasWS: boolean = child.numChildren() > 0;
					if(hasWS)
						rhsList.push(this.targetGrammar.WHITESPACE_PLUS.withName("ws+"));
				}
			}
            return rhsList;
		});
	}

    private program(): Rule {
		return this.targetGrammar.join("program",
				new NonTerminal("sentence").withName("sequence"),
				this.LINEBREAK_STAR.getTarget(),
				this.LINEBREAK_STAR.getTarget(),
				this.LINEBREAK_STAR.getTarget(),
                true,
				IntRange.STAR);
	}

    private readonly parseStartListeners: ParseStartListener[] = [];

    addParseStartListener(listener: ParseStartListener): void {
        this.parseStartListeners.push(listener);
    }

    removeParseStartListener(listener: ParseStartListener): void {
        const idx = this.parseStartListeners.indexOf(listener);
        if(idx !== -1)
            this.parseStartListeners.splice(idx, 1);
    }

    private fireParsingStarted(): void {
        for(let l of this.parseStartListeners)
            l();
    }
}
