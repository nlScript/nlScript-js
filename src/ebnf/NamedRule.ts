import { Named } from "../core/Named.js";
import { ParseListener } from "./ParseListener.js";
import { Rule } from "./Rule.js";

export class NamedRule extends Named<Rule> {
    
    constructor(object: Rule, name: string | undefined = undefined) {
        super(object, name);
    }

    onSuccessfulParsed(listener: ParseListener): void {
        this.get().onSuccessfulParsed(listener);
    }
}
