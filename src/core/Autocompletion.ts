export class Autocompletion {
    private readonly completion: string;
    private readonly alreadyEnteredText: string;

    constructor(completion: string, alreadyEnteredText: string) {
        this.completion = completion;
        this.alreadyEnteredText = alreadyEnteredText;
    }

    getCompletion(): string {
        return this.completion;
    }

    getAlreadyEnteredText(): string {
        return this.alreadyEnteredText;
    }

    equals(o: any): boolean {
        if(o instanceof Autocompletion)
            return (o as Autocompletion).completion === this.completion;
        return false;
    }

    toString(): string {
        return this.completion;
    }
}