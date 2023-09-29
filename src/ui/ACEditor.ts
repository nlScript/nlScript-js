import { EditorView, basicSetup } from "codemirror";
import { highlight_extension, ParameterizedCompletion } from "./ParameterizedCompletion";
import { StateEffect } from "@codemirror/state";
import { Parser } from "../Parser";
import { ParsedNode } from "../ParsedNode";
import { Autocompletion } from "../core/Autocompletion";
import { ACCompleter } from "./ACCompleter";

export class ACEditor {

    private readonly editor: EditorView;

    private readonly parser: Parser;

    private parameterizedCompletion?: ParameterizedCompletion = undefined;

    private readonly completer: ACCompleter;

    constructor(parser: Parser, parent: HTMLElement) {
        this.parser = parser;
        const that = this;
        const editorElement = this.createEditorElement(parent);
        const outputElement = this.createOutputElement(parent);
        const runButton = this.createButton(parent);
        runButton.onclick = () => that.run();
        this.editor = new EditorView({
            extensions: [],
            parent: editorElement
        });
        this.completer = new ACCompleter(this.editor);
        this.editor.dispatch({
            effects: StateEffect.reconfigure.of([
                EditorView.domEventHandlers({
                    keydown: (e: KeyboardEvent, view: EditorView) => that.handleKeyEvent(e, view),
                }),
                this.completer.autocompletionExtension,
                basicSetup,
                highlight_extension,
            ])
        });
        // editor.dispatch(editor.state.replaceSelection("hahahahahah "));
        // editor.dispatch({selection: {anchor: 8, head: 11}});
    }

    private createEditorElement(parent: HTMLElement): HTMLElement {
        const el = document.createElement("div");
        el.id = "nls-editor";
        el.setAttribute("style", "width: 100%; height: 70%; margin-bottom: 3px; border: 1px solid gray;");
        parent.appendChild(el);
        return el;
    }

    private createOutputElement(parent: HTMLElement): HTMLElement {
        const el = document.createElement("textarea");
        el.id = "nls-output";
        el.setAttribute("style", "width: 100%; height: 25%; margin-top: 3px; border: 1px solid gray; padding: 0px;");
        el.setAttribute("readonly", "true");
        parent.appendChild(el);
        return el;
    }

    private createButton(parent: HTMLElement): HTMLElement {
        const el = document.createElement("button");
        el.id = "nls-run";
        el.setAttribute("style", "margin-top: 10px; margin-left: auto; margin-right: auto; display: block;");
        el.setAttribute("type", "button");
        el.innerText = "Run";
        parent.appendChild(el);
        return el;
    }

    run(): void {
        console.debug("running");
        const entireText: string = this.editor.state.doc.toString();
        const pn: ParsedNode = this.parser.parse(entireText);
        pn.evaluate();
    }

    insertCompletion(completion: string | undefined): void {
        if(!completion)
            return;
        const selection = this.editor.state.selection;
        const caret = selection.main.head;
        
        if(selection.main.empty)
            this.editor.dispatch({selection: { anchor: caret, head: caret - this.completer.completionPrefix().length }})

        console.log(this.editor.state.selection.main.anchor);
        console.log(this.editor.state.selection.main.head);

        if(completion.indexOf("${") >= 0) {
            this.cancelParameterizedCompletion();
            this.parameterizedCompletion = new ParameterizedCompletion(this.editor);
            this.parameterizedCompletion.setParameterChangeListener((pIdx: number, wasLast: boolean) => this.parameterChanged(pIdx, wasLast));
            this.parameterizedCompletion.replaceSelection(completion);
        }
        else {
            this.cancelParameterizedCompletion();
            this.editor.dispatch(this.editor.state.replaceSelection(completion));
            this.completer.hidePopup();
            this.autocomplete();
        }
    }

    parameterChanged(_pIdx: number, wasLast: boolean): void {
        if(wasLast) {
            this.cancelParameterizedCompletion();
            this.autocomplete();
        } else {
            this.autocomplete(false);
        }
    }

    cancelParameterizedCompletion() {
        if(this.parameterizedCompletion !== undefined) {
            this.parameterizedCompletion.cancel()
        }
        this.parameterizedCompletion = undefined;
    }

    handleKeyEvent(e: KeyboardEvent, view: EditorView): boolean {
        console.log("keydown", e.key, e);
        if(this.completer.isActive()) {
            if(e.key === "Enter") {
                this.insertCompletion(this.completer.getSelected());
                return true;
            }
            if(e.key === "ArrowUp") {
                this.completer.selectPrevious();
                return true;
            }
            else if(e.key === "ArrowDown") {
                this.completer.selectNext();
                return true;
            }
            else if(e.key === "Escape") {
                this.completer.hidePopup();
                return true;
            }
            else if(e.key === "Tab") {
                this.completer.hidePopup();
                return true;
            }
        }
        else if(e.key === " " && e.ctrlKey) {
            this.autocomplete();
            return true;
        }

        if(this.parameterizedCompletion) {
            this.parameterizedCompletion.handleKeyEvent(e);
            if(e.defaultPrevented)
                return true;
        }

        if(e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            view.dispatch(view.state.replaceSelection(e.key));
            this.autocomplete()
            return true;
        }
        return false;
    }

    autocomplete(autoinsertSingleOption: boolean = true) {
        const entireText: string = this.editor.state.doc.toString();
        const anchor: number = this.editor.state.selection.main.anchor;
        const cursorIsAtEnd: boolean = anchor === entireText.length || entireText.substring(anchor).trim().length == 0;
        autoinsertSingleOption = autoinsertSingleOption && cursorIsAtEnd;

        const textToCursor: string = entireText.substring(0, anchor);
        const autocompletions: Autocompletion[] = [];
        const pn: ParsedNode = this.parser.parse(textToCursor, autocompletions);
        console.log(pn.getMatcher().state);

        if(autocompletions.length === 1 && autoinsertSingleOption) {
            this.completer.setCompletions(autocompletions);
            this.insertCompletion(autocompletions[0].getCompletion());
        }
        else if(autocompletions.length > 1) {
            this.completer.setCompletions(autocompletions);
            const alreadyEntered: string = autocompletions[0].getAlreadyEnteredText();

            const remainingText = entireText.substring(anchor);
            let matchingLength = 0;
            for(let ac of autocompletions) {
                const remainingCompletion = ac.getCompletion().substring(alreadyEntered.length);
                if(remainingText.startsWith(remainingCompletion)) {
                    matchingLength = remainingCompletion.length;
                    break;
                }
            }
            if(matchingLength > 0) {
                this.editor.dispatch({selection: {anchor: anchor, head: anchor + matchingLength }});
            }
            this.completer.complete();
        }
        else {
            this.completer.hidePopup();
        }
    }
}


