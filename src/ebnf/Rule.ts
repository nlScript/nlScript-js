import { Autocompleter, GetAutocompletionFunction } from "../Autocompleter.js";
import { RepresentsSymbol } from "../core/RepresentsSymbol.js";
import { BNF } from "../core/BNF.js";
import { NonTerminal } from "../core/NonTerminal.js";
import { Sym } from "../core/Symbol.js";
import { Evaluator, EvaluateFunction } from "../Evaluator.js";
import { EBNFProduction } from "./EBNFProduction.js";
import { NamedRule } from "./NamedRule.js";
import { ParseListener } from "./ParseListener.js";

abstract class Rule implements RepresentsSymbol {

	protected readonly type: string;
	protected readonly tgt: NonTerminal;
	protected readonly children: Sym[];
	
    protected parsedChildNames: (string | undefined)[];

	private evaluator: Evaluator; // (pn: DefaultParsedNode) => any; // Evaluator;
	private autocompleter: Autocompleter | undefined;
	private _onSuccessfulParsed: ParseListener;

	protected productions: EBNFProduction[] = [];

	constructor(type: string, tgt: NonTerminal | undefined, ...children: Sym[]) {
		this.type = type;
		this.tgt = tgt !== undefined
				? tgt
				: new NonTerminal(type + ":" + NonTerminal.makeRandomSymbol());
		this.children = children;
	}

    withName(name: string | undefined = undefined): NamedRule {
        return new NamedRule(this, name);
    }

	getTarget(): NonTerminal {
		return this.tgt;
	}

    getRepresentedSymbol(): Sym {
        return this.tgt;
    }

	getChildren(): Sym[]  {
		return this.children;
	}

	getEvaluator(): Evaluator {
		return this.evaluator;
	}

	setEvaluator(evaluator: Evaluator | EvaluateFunction): Rule {
		if(typeof(evaluator) === 'function')
			evaluator = { evaluate: evaluator };
		this.evaluator = evaluator;
		return this;
	}

	getAutocompleter(): Autocompleter | undefined{
		return this.autocompleter;
	}

	setAutocompleter(autocompleter: Autocompleter | GetAutocompletionFunction | undefined): Rule {
		if(typeof(autocompleter) === 'function')
			autocompleter = { getAutocompletion: autocompleter };
		this.autocompleter = autocompleter;
		return this;
	}

	getProductions(): EBNFProduction[] {
		return this.productions;
	}

	onSuccessfulParsed(listener: ParseListener): Rule {
		this._onSuccessfulParsed = listener;
		return this;
	}

	getOnSuccessfulParsed(): ParseListener {
		return this._onSuccessfulParsed;
	}

	static addProduction(grammar: BNF, rule: Rule, left: NonTerminal, ...right: Sym[]): EBNFProduction {
		let production: EBNFProduction = new EBNFProduction(rule, left, ...right);
		rule.productions.push(production);
		grammar.addProduction(production);
		return production;
	}

	getNameForChild(idx: number): string | undefined {
		if(this.parsedChildNames === undefined) {
			return undefined;
		}
		if(this.parsedChildNames.length == 1)
			return this.parsedChildNames[0];
		if(idx >= this.parsedChildNames.length)
			return "no name";
		return this.parsedChildNames[idx];
	}

	setParsedChildNames(...parsedChildNames: (string | undefined)[]): void {
		this.parsedChildNames = parsedChildNames;
	}

	abstract createBNF(grammar: BNF): void;
}

export { Rule };
