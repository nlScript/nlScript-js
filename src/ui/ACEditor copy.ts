import { EditorView, basicSetup } from "codemirror";
import { CompletionContext, autocompletion, insertCompletionText, Completion, pickedCompletion, startCompletion } from "@codemirror/autocomplete";
import { highlight_extension, ParameterizedCompletion } from "./ParameterizedCompletion";
import { ViewUpdate } from "@codemirror/view";
import { Transaction } from "@codemirror/state";
import { Parser } from "../Parser";
import { ParsedNode } from "../ParsedNode";
import { Autocompletion } from "../core/Autocompletion";

export class ACEditor {

    private readonly editor: EditorView;

    private readonly parser: Parser;

    private parameterizedCompletion?: ParameterizedCompletion = undefined;

    constructor(parser: Parser, parent: HTMLElement) {
        this.parser = parser;
        const that = this;
        const getCompletionsFunction = (c: CompletionContext) => this.getAutocompletions(c);
        this.editor = new EditorView({
            extensions: [
                autocompletion({
                    activateOnTyping: false,
                    defaultKeymap: false,
                    override: [getCompletionsFunction]
                }),
                EditorView.domEventHandlers({
                    keydown: (e: KeyboardEvent, view: EditorView) => that.handleKeyEvent(e, view),
                }),
                basicSetup,
                highlight_extension,
                EditorView.updateListener.of(update => that.documentUpdated(update)),
            ],
            parent: parent
        });
        // editor.dispatch(editor.state.replaceSelection("hahahahahah "));
        // editor.dispatch({selection: {anchor: 8, head: 11}});
    }

    documentUpdated(update: ViewUpdate): void {
        let transactions: readonly Transaction[] = update.transactions;
        for(let transaction of transactions) {           
            let c: Completion | undefined = transaction.annotation(pickedCompletion);
            if(c) {
                if(c.label.indexOf('${') === -1)
                    startCompletion(update.view);
            }
        }
    }

    handleKeyEvent(e: KeyboardEvent, _view: EditorView): boolean {
        console.log("keydown", e.key, e);
        // if(autocompletion.)
        if(this.parameterizedCompletion)
            this.parameterizedCompletion.handleKeyEvent(e);
        return e.defaultPrevented;
    }

    getAutocompletionsFromParser(caret?: number) {
        if(caret === undefined)
            caret = this.editor.state.selection.main.head;
        const content: string = this.editor.state.sliceDoc(0, caret);
        const autocompletions: Autocompletion[] = [];
        const pn: ParsedNode = this.parser.parse(content, autocompletions);
        console.log(pn.getMatcher().state);
        return autocompletions;
    }

    getAutocompletions(context: CompletionContext) {
        console.log(context);
        const autocompletions: Autocompletion[] = this.getAutocompletionsFromParser(context.pos);
        let alreadyEnteredLength: number | undefined = undefined;
        const applyFunction = (v: EditorView, c: Completion, f: number, t: number) => this.insertParameterizedCompletion(v, c, f, t); 

        const options = autocompletions.map(a => {
            const completion = a.getCompletion();
            if(alreadyEnteredLength === undefined) alreadyEnteredLength = a.getAlreadyEnteredText().length;
            if(completion.indexOf("${") === -1) {
                return { label: completion };
            }
            else {
                return { label: completion, apply: applyFunction };
            }
        });
        if(alreadyEnteredLength === undefined)
            alreadyEnteredLength = 0;

        // inspired by @codemirror/autocomplete state.ts applyCompletion()
        // auto-insert single option
        if(options.length === 1) {
            const option: Completion = options[0];
            const apply = option.apply || option.label;
            if(typeof apply == "string") {
                this.cancelParameterizedCompletion();
                this.editor.dispatch({
                    ...insertCompletionText(context.state, options[0].label, context.pos - alreadyEnteredLength, context.pos),
                    annotations: pickedCompletion.of(options[0]),
                });
            }
            else {
                apply(this.editor, option, context.pos - alreadyEnteredLength, context.pos);
            }
            
            options.length = 0;
        }

        return {
            from: context.pos - alreadyEnteredLength,
            filter: false,
            options: options,
        };
    }

    getAutocompletionsDummy(context: CompletionContext) {
        console.log(context.pos);
        // editor.dispatch(editor.state.replaceSelection("XXX"));
        // this.editor.state.field(autocompletion).
        const applyFunction = (v: EditorView, c: Completion, f: number, t: number) => this.insertParameterizedCompletion(v, c, f, t); 
        return {
            from: context.pos > 3 ? context.pos - 3 : context.pos,
            options: [
                {label: "match"},
                {label: "hello"},
                {label: "${x} + ${y} = ${result}.", apply: applyFunction},
                // snippetCompletion("${x} + ${y} = ${result}.${}", {
                //     label: "x + y = result"
                // }),
            ]
        };
    }

    cancelParameterizedCompletion() {
        if(this.parameterizedCompletion !== undefined) {
            this.parameterizedCompletion.cancel()
            this.parameterizedCompletion = undefined;
        }
    }

    insertParameterizedCompletion(view: EditorView, completion: Completion, _from: number, _to: number): void {
        this.cancelParameterizedCompletion()
        this.parameterizedCompletion = new ParameterizedCompletion(view);
        this.parameterizedCompletion.setParameterChangeListener((paramIndex: number, isLast: boolean) => {
            console.log("parameter changed", paramIndex, isLast);
            if(isLast) {
                this.cancelParameterizedCompletion();
                startCompletion(this.editor);
            } else {
                // Cannot just startCompletion(this.editor) here, because only the popup should be 
                // shown in case of multiple options, but single options shouldn't automatically be
                // inserted.
                let autocompletions = this.getAutocompletionsFromParser();
                if(autocompletions.length > 1)
                    startCompletion(this.editor);
            }

        });
        this.parameterizedCompletion.replaceSelection(completion.label);
        // let ts = insertCompletionText(view.state, "", from, from);
        // this.editor.dispatch(ts);
        
        return this.editor.dispatch({
            annotations: pickedCompletion.of(completion),
        });
        // return this.editor.dispatch({userEvent: "input.complete"});
    }
}


