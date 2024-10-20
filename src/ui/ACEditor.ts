import { highlight_extension, ParameterizedCompletion, ParsedParam } from "./ParameterizedCompletion.js";
import { error_highlight_extension, ErrorHighlight } from "./ErrorHighlight.js";
import { StateEffect } from "@codemirror/state";
import { Parser } from "../Parser.js";
import { ParsedNode } from "../ParsedNode.js";
import { Autocompletion } from "../core/Autocompletion.js";
import { ACCompleter } from "./ACCompleter.js";
import { ParseException } from "../ParseException.js";
import { Matcher } from "../core/Matcher.js";
import { BNF } from "../core/BNF.js";
import { Sym } from "../core/Symbol.js";
import { NonTerminal } from "../core/NonTerminal.js";

import {keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, crosshairCursor,
    lineNumbers, highlightActiveLineGutter, EditorView} from "@codemirror/view"
import {Extension, EditorState} from "@codemirror/state"
import {defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,
    foldGutter, foldKeymap} from "@codemirror/language"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
import {searchKeymap} from "@codemirror/search"
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, completionStatus, pickedCompletion} from "@codemirror/autocomplete"
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

        const completionPickedListenerExtension = EditorView.updateListener.of((v) => {
            const { transactions } = v;
            for (let transaction of transactions) {
                const picked = transaction.annotation(pickedCompletion);
                if(picked !== undefined) {
                    // This is only the case when clicked on an option. Not if <Enter> is
                    // pressed on an item, and not if <Escape> is pressed
                    that.autocomplete();
                }
            }
        });


        this.editor.dispatch({
            effects: StateEffect.reconfigure.of([
                completionPickedListenerExtension,
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

    setText(text: string): void {
        this.editor.dispatch({
            changes: {from: 0, to: this.editor.state.doc.length, insert: text}
          });
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
            (console.error || console.log).call(console, e.stack || e);
        }
    }

    private lastInsertionPosition: number = -1;

    // corresponds to AutocompletionContext.insertCompletion()
    insertCompletion(completion: Autocompletion | undefined): void {
        if(!completion)
            return;
        const selection = this.editor.state.selection;
        const caret = selection.main.head;

        if(this.lastInsertionPosition === caret)
            return;

        this.lastInsertionPosition = caret;

        // const entireText: string = this.editor.state.doc.toString();
        // const cursorIsAtEnd: boolean = caret === entireText.length || entireText.substring(caret).trim().length == 0;

        if(selection.main.empty)
            this.editor.dispatch({selection: { anchor: caret, head: caret - this.completer.completionPrefix().length }})

        const repl = completion.getCompletion(Autocompletion.Purpose.FOR_INSERTION);
        if(repl.indexOf("${") >= 0) {
            this.cancelParameterizedCompletion();
            this.parameterizedCompletion = new ParameterizedCompletion(this.editor);
            this.parameterizedCompletion.setParameterChangeListener((pIdx: number, wasLast: boolean) => this.parameterChanged(pIdx, wasLast));
            this.parameterizedCompletion.replaceSelection(completion);
        }
        else {
            this.editor.dispatch(this.editor.state.replaceSelection(repl));
            this.completer.hidePopup();
            setTimeout(() => this.autocomplete());
        }
    }

    parameterChanged(pIdx: number, wasLast: boolean): void {
        const source: ParameterizedCompletion = this.parameterizedCompletion as ParameterizedCompletion;
        if(wasLast) {
            this.cancelParameterizedCompletion();
            this.autocomplete();
        } else {
            // this.autocomplete(false);
            const completions: Autocompletion[] = source.getParameter(pIdx).allOptions;
            this.completer.setCompletions(completions);
            if(completions.length < 2)
                this.completer.hidePopup();
            else {
                this.completer.complete();
            }
        }
    }

    cancelParameterizedCompletion() {
        if(this.parameterizedCompletion !== undefined) {
            this.parameterizedCompletion.cancel()
        }
        this.parameterizedCompletion = undefined;
    }

    handleKeyEvent(e: KeyboardEvent, view: EditorView): boolean {
        if(this.completer.isActive()) {
            if(e.key === "Enter") {
                const completion: Autocompletion | undefined = this.completer.getSelected();
                if(completion !== undefined) {
                    this.insertCompletion(completion);
                    // setTimeout(() => this.autocomplete());
                }
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
            if(e.key === "Escape") {
                this.cancelParameterizedCompletion();
                return true;
            }
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

    // corresponds to AutocompletionContext.doAutocompletion()
    autocomplete(autoinsertSingleOption: boolean = true) {
        const entireText: string = this.editor.state.doc.toString();
        const anchor: number = this.editor.state.selection.main.anchor;

        const textToCursor: string = entireText.substring(0, anchor);
        this.errorHighlight?.clearError();
        const autocompletions: Autocompletion[] = [];
        let pn: ParsedNode;
        try {
            pn = this.parser.parse(textToCursor, autocompletions);
        } catch(e: any) {
            if(e instanceof ParseException) {
                const f: Matcher = e.getFirstAutocompletingAncestorThatFailed().getMatcher();
                this.errorHighlight?.setError(f.pos, f.pos + f.parsed.length);
                return;
            }
            else
                throw e;
        }

        const bnf: BNF = this.parser.getTargetGrammar().getBNF();
        if(this.parameterizedCompletion !== undefined) {
            if(autocompletions.length > 0) {
                let atLeastOneCompletionForCurrentParamter: boolean= false;
                for(let comp of autocompletions) {
                    let symbol: Sym = comp.forSymbol;

                    // if comp is an EntireSequence completion, we should just check the first
                    // we can do that using ParameterizedCompletionContext.parseParameters
                    if(comp instanceof Autocompletion.EntireSequence) {
                        let tmp: ParsedParam[] = [];
                        ParameterizedCompletion.parseParameters(comp, tmp, 0);
                        comp = tmp[0].parameterizedCompletion;
                        symbol = comp.forSymbol;
                    }
                    if(symbol.equals(this.parameterizedCompletion.getForAutocompletion().forSymbol)) {
                        atLeastOneCompletionForCurrentParamter = true;
                        break;
                    }

                    // check if symbol is a descendent of the parameters autocompletion symbol
                    const pp: ParsedParam | undefined = this.parameterizedCompletion.getCurrentParameter();
                    const parameterSymbol: Sym | undefined = pp?.parameterizedCompletion.forSymbol;
                    // symbol == parameterSymbol? -> fine
                    if(symbol.equals(parameterSymbol)) {
                        atLeastOneCompletionForCurrentParamter = true;
                        break;
                    }

                    if(parameterSymbol instanceof NonTerminal) {
                        // check recursively if symbol is in the list of child symbols
                        if(parameterSymbol.uses(symbol, bnf)) {
                            atLeastOneCompletionForCurrentParamter = true;
                            break;
                        }
                    }
                }
                if(!atLeastOneCompletionForCurrentParamter) {
                    this.parameterizedCompletion.next();
                    return;
                }
            }
        }

        if(autocompletions.length === 1) {
            if(autoinsertSingleOption || (autocompletion instanceof Autocompletion.Literal)) {
                this.completer.setCompletions(autocompletions);
                this.insertCompletion(autocompletions[0]);
                this.completer.hidePopup();
            }
        }
        else if(autocompletions.length > 1) {
            this.completer.setCompletions(autocompletions);
            this.completer.complete();
        }
        else {
            this.completer.hidePopup();
        }
    }
}

