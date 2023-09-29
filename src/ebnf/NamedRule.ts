import { Named } from "../core/Named";
import { ParseListener } from "./ParseListener";
import { Rule } from "./Rule";

export class NamedRule extends Named<Rule> {
    
    constructor(object: Rule, name: string | undefined = undefined) {
        super(object, name);
    }

    onSuccessfulParsed(listener: ParseListener): void {
        this.get().onSuccessfulParsed(listener);
    }
}