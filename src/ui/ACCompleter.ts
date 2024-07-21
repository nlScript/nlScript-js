import { Autocompletion } from "../core/Autocompletion.js";
import { CompletionContext, Completion, CompletionResult, autocompletion, selectedCompletion,  startCompletion, completionStatus, currentCompletions, moveCompletionSelection, closeCompletion } from "@codemirror/autocomplete";
import { Extension, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

function render(completion: Completion, _state: EditorState): Node | null {
    let text: string = completion.apply ? completion.apply as string : completion.label;

    const el = document.createElement("span");
    el.innerHTML = text;

    completion.label = "";
    return el;
}

/**
 * This class corresponds to the Python MyCompleter class.
 */
export class ACCompleter {

    private completions: Autocompletion[] = [];

    readonly autocompletionExtension: Extension;

    private readonly view: EditorView;

    constructor(view: EditorView) {
        this.view = view;
        const getCompletionsFn = (c: CompletionContext) => this.getCompletions(c);
        this.autocompletionExtension = autocompletion({
            activateOnTyping: false,
            defaultKeymap: false,
            interactionDelay: 0,
            closeOnBlur: false,
            override: [getCompletionsFn],
            addToOptions: [{
                render: render,
                position: 0
            }]
        });
    }

    selectNext(): void {
        moveCompletionSelection(true)(this.view);
    }

    selectPrevious(): void {
        moveCompletionSelection(false)(this.view);
    }

    setCompletions(completions: Autocompletion[]): void {
        this.completions = completions;
    }

    getSelected(): Autocompletion | undefined {
        const ret = selectedCompletion(this.view.state);
        if(ret === null)
            return undefined;

        const idx: number = currentCompletions(this.view.state).indexOf(ret);
        if(idx < 0)
            return undefined

        return ret === null ? undefined : this.completions[idx];
    }

    completionPrefix(): string {
        return this.completions[0].getAlreadyEntered();
    }

    hidePopup(): void {
        closeCompletion(this.view);
    }

    complete(): void {
        startCompletion(this.view);
    }

    isActive(): boolean {
        return completionStatus(this.view.state) !== null && currentCompletions(this.view.state).length > 1;
    }

    private getCompletions(context: CompletionContext): CompletionResult {
        let alreadyEnteredLength: number | undefined = undefined;
        const options = this.completions.map((a: Autocompletion) => {
            if(alreadyEnteredLength === undefined)
                alreadyEnteredLength = a.getAlreadyEntered().length;
            let apply = a.getCompletion(Autocompletion.Purpose.FOR_MENU);
            let completion: string = apply;

            apply = apply.replaceAll("${", "<b>").replaceAll("}", "</b>");

            // const parsedParams: ParsedParam[] = [];
            // const insertionString: string = ParameterizedCompletion.parseParameters(a, parsedParams);
            // if(parsedParams.length > 0) {
            //     let sb = insertionString;
            //     for(let i = parsedParams.length - 1; i >= 0; i--) {
            //         let param: ParsedParam = parsedParams[i];
            //         sb = sb.substring(0, param.i1) + "</b>" + sb.substring(param.i1);
            //         sb = sb.substring(0, param.i0) + "<b>" + sb.substring(param.i0);
            //     }
            //     apply = sb;
            // }

            if(apply.startsWith("\n") || apply.startsWith("\r"))
                apply = "&lt;new line&gt;";
            if(apply === "")
                apply = "&lt;empty&gt;";

            return { label: completion, apply: apply };
        });
        if(alreadyEnteredLength === undefined)
            alreadyEnteredLength = 0;

        return {
            from: context.pos - alreadyEnteredLength,
            filter: false,
            options: options
        };
    }
}
