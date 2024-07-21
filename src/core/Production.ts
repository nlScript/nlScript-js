import { NonTerminal } from "./NonTerminal.js";
import { Terminal } from "./Terminal.js";
import { Sym } from "./Symbol.js";
import { DefaultParsedNode } from "./DefaultParsedNode.js";

type AstBuilder = (parent: DefaultParsedNode, ...children: DefaultParsedNode[]) => void;
type ExtensionListener = (parent: DefaultParsedNode, ...children: DefaultParsedNode[]) => void;

module AstBuilder {
	export const DEFAULT: AstBuilder = (parent: DefaultParsedNode, ...children: DefaultParsedNode[]): void => parent.addChildren(...children);
}

class Production {
    private readonly left: NonTerminal;
	private readonly right: Sym[];

	private astBuilder: AstBuilder | undefined = undefined;
	private extensionListener: ExtensionListener | undefined = undefined;

    constructor(left: NonTerminal, ...right: Sym[]) {
        this.left = left;
        this.right = Production.removeEpsilon(right);
    }

    static removeEpsilon(arr: Sym[]): Sym[] {
        return arr.filter((value: Sym) => !value.equals(Terminal.EPSILON));
    }

    getLeft(): NonTerminal {
		return this.left;
	}

	getRight(): Sym[] {
		return this.right;
	}

	setAstBuilder(astBuilder: AstBuilder) {
		this.astBuilder = astBuilder;
	}

	builtAST(parent: DefaultParsedNode, ...children: DefaultParsedNode[]): void {
		if(this.astBuilder !== undefined) {
			this.astBuilder(parent, ...children);
			return;
		}
		parent.addChildren(...children);
	}

	wasExtended(parent: DefaultParsedNode, ...children: DefaultParsedNode[]): void {
		if(this.extensionListener !== undefined)
			this.extensionListener(parent, ...children);
	}

	onExtension(listener: ExtensionListener): void {
		if(this.extensionListener !== undefined)
			throw new Error("ExtensionListener cannot be overwritten");
		this.extensionListener = listener;
	}

	toString(): string {
		let left: string = this.getLeft().toString();
        let sb: string = "";
		for(let k: number = 0; k < (50 - left.length); k++)
			sb += ' ';
		sb += left;
		sb += " -> ";
		let right: Sym[] = this.getRight();
		for(let symbol of right) {
            sb += symbol + " ";
		}
		return sb;
	}

    equals(o: any): boolean {
        if (!(o instanceof Production))
            return false;
        const p: Production = o as Production;
        return this.left.equals(p.left) && Production.arraysEqual(this.right, p.right);
	}

    static arraysEqual(a: any[], b: any[]) {
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
}

export { Production, AstBuilder, ExtensionListener };
