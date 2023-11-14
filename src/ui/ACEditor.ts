import { EditorView } from "codemirror";
import { highlight_extension, ParameterizedCompletion } from "./ParameterizedCompletion";
import { error_highlight_extension, ErrorHighlight } from "./ErrorHighlight";
import { StateEffect } from "@codemirror/state";
import { Parser } from "../Parser";
import { ParsedNode } from "../ParsedNode";
import { Autocompletion } from "../core/Autocompletion";
import { ACCompleter } from "./ACCompleter";
import { ParseException } from "../ParseException";
import { Matcher } from "../core/Matcher";


import {keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, crosshairCursor,
    lineNumbers, highlightActiveLineGutter} from "@codemirror/view"
import {Extension, EditorState} from "@codemirror/state"
import {defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,
    foldGutter, foldKeymap} from "@codemirror/language"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
import {searchKeymap} from "@codemirror/search"
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {lintKeymap} from "@codemirror/lint"

const basicSetup: Extension = (() => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    // highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ])
  ])()


export class ACEditor {

    private readonly editor: EditorView;

    private readonly parser: Parser;

    private parameterizedCompletion?: ParameterizedCompletion = undefined;

    private readonly errorHighlight?: ErrorHighlight = undefined;

    private readonly outputElement: HTMLElement;

    private readonly completer: ACCompleter;

    private onRun: () => void = () => this.run();

    private beforeRun: () => void = () => {};

    private afterRun: () => void = () => {};

    constructor(parser: Parser, parent: HTMLElement) {
        this.parser = parser;
        const that = this;
        const editorElement = this.createEditorElement(parent);
        this.outputElement = this.createOutputElement(parent);
        const runButton = this.createButton(parent);
        runButton.onclick = () => that.onRun();
        this.editor = new EditorView({
            extensions: [],
            parent: editorElement
        });
        this.errorHighlight = new ErrorHighlight(this.editor);
        this.completer = new ACCompleter(this.editor);
        this.editor.dispatch({
            effects: StateEffect.reconfigure.of([
                EditorView.domEventHandlers({
                    keydown: (e: KeyboardEvent, view: EditorView) => that.handleKeyEvent(e, view),
                }),
                this.completer.autocompletionExtension,
                basicSetup,
                EditorView.lineWrapping,
                highlight_extension,
                error_highlight_extension,
            ]),
        });
        // editor.dispatch(editor.state.replaceSelection("hahahahahah "));
        // editor.dispatch({selection: {anchor: 8, head: 11}});
    }

    getSelectedLinesStart(): number {
        const selFrom: number = this.editor.state.selection.main.from;
        return this.editor.state.doc.lineAt(selFrom).from;
    }

    getSelectedLinesEnd(): number {
        const selTo: number = this.editor.state.selection.main.to;
        return this.editor.state.doc.lineAt(selTo).to;
    }

    getSelectedLines(): string {
        const from: number = this.getSelectedLinesStart();
        const to: number = this.getSelectedLinesEnd();
        return this.editor.state.sliceDoc(from, to);
    }

    setOnRun(onRun: () => void) {
        this.onRun = onRun;
    }

    setBeforeRun(beforeRun: () => void) {
        this.beforeRun = beforeRun;
    }

    setAfterRun(afterRun: () => void) {
        this.afterRun = afterRun;
    }

    private createEditorElement(parent: HTMLElement): HTMLElement {
        const el = document.createElement("div");
        el.id = "nls-editor";
        el.setAttribute("style", "width: 100%; height: 300px; margin-bottom: 3px; border: 1px solid gray; flex-grow: 3; overflow: auto;");
        parent.appendChild(el);
        return el;
    }

    private createOutputElement(parent: HTMLElement): HTMLElement {
        const el = document.createElement("textarea");
        el.id = "nls-output";
        el.setAttribute("style", "width: 100%; height: 100px; margin-top: 3px; border: 1px solid gray; flex-grow: 2; padding: 0px; resize: none; overflow: auto;");
        el.setAttribute("readonly", "true");
        parent.appendChild(el);
        return el;
    }

    private createButton(parent: HTMLElement): HTMLElement {
        const el = document.createElement("button");
        el.id = "nls-run";
        el.setAttribute("style", "margin-top: 10px; margin-left: auto; margin-right: auto; display: block; margin-bottom: 10px;");
        el.setAttribute("type", "button");
        el.innerText = "Run";
        parent.appendChild(el);
        return el;
    }

    run(selectedLinesOnly: boolean = false): void {
        console.debug("running");
        this.outputElement.textContent = "";
        const entireText: string = this.editor.state.doc.toString();
        try {
            this.beforeRun();
            const textToEvaluate: string = selectedLinesOnly ? this.getSelectedLines() : entireText;
            const pn: ParsedNode = this.parser.parse(textToEvaluate);
            pn.evaluate();
            this.afterRun();
        } catch(e: any) {
            if(e instanceof Error)
                this.outputElement.textContent = (e as Error).message;
            else
                this.outputElement.textContent = e.toString();
        }
    }

    insertCompletion(completion: string | undefined): void {
        if(!completion)
            return;
        const selection = this.editor.state.selection;
        const caret = selection.main.head;

        const entireText: string = this.editor.state.doc.toString();
        const cursorIsAtEnd: boolean = caret === entireText.length || entireText.substring(caret).trim().length == 0;

        if(selection.main.empty)
            this.editor.dispatch({selection: { anchor: caret, head: caret - this.completer.completionPrefix().length }})

        if(completion.indexOf("${") >= 0) {
            this.cancelParameterizedCompletion();
            this.parameterizedCompletion = new ParameterizedCompletion(this.editor);
            this.parameterizedCompletion.setParameterChangeListener((pIdx: number, wasLast: boolean) => this.parameterChanged(pIdx, wasLast));
            this.parameterizedCompletion.replaceSelection(completion);
        }
        else {
            this.editor.dispatch(this.editor.state.replaceSelection(completion));
            this.completer.hidePopup();
            if(cursorIsAtEnd)
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

        const textToCursor: string = entireText.substring(0, anchor);
        this.errorHighlight?.clearError();
        const autocompletions: Autocompletion[] = [];
        let pn: ParsedNode;
        try {
            pn = this.parser.parse(textToCursor, autocompletions);
            console.log(pn.getMatcher().state);
        } catch(e: any) {
            if(e instanceof ParseException) {
                const f: Matcher = e.getFirstAutocompletingAncestorThatFailed().getMatcher();
                this.errorHighlight?.setError(f.pos, f.pos + f.parsed.length);
                return;
            }
            else
                throw e;
        }

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

