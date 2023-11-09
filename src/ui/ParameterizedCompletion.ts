import { StateEffect, StateField, Range, RangeCursor } from "@codemirror/state"
import { Decoration, DecorationSet, WidgetType } from "@codemirror/view"
import { EditorView } from "codemirror";

// code mirror effect that you will use to define the effect you want (the decoration)
const addHighlight = StateEffect.define<Range<Decoration>[]>();
const removeHighlight = StateEffect.define<(from: number, to: number, value: any) => boolean>();

// define a new field that will be attached to your view state as an extension, update will be called at each editor's change
export const highlight_extension = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(value, transaction) {
    value = value.map(transaction.changes)

    for (let effect of transaction.effects) {
      if (effect.is(addHighlight)) value = value.update({add: effect.value, sort: true})
      else if (effect.is(removeHighlight)) value = value.update({filter: effect.value})
    }

    return value
  },
  provide: f => EditorView.decorations.from(f),
});


// this is your decoration where you can define the change you want : a css class or directly css attributes
const highlight_decoration = Decoration.mark({
  inclusive: true,
  attributes: {style: "/* background-color: #b7c1e8; */border: gray 1px solid;"},
  tagName: "span",

  // class: 'red_back'
});

class MyWidgetType extends WidgetType {
    constructor() {
        super();
    }
    toDOM(_view: EditorView) {
        let span = document.createElement("span");
        span.setAttribute("style", "border-right: gray 1px solid; margin-left: 1px;");
        return span;
    }
}

const end_decoration = Decoration.widget({
    // attributes: {style: "border-right: gray 1px solid;"},
    // inclusive: false,
    // tagName: "span",
    widget: new MyWidgetType(),
    side: 1000,
});

// your editor's view
// let main_view = new EditorView({ 
//   extensions: [highlight_extension]
// });

function highlight(editor: EditorView, from: number, to: number): void {
    // this is where the change takes effect by the dispatch. The of method instanciate the effect. You need to put this code where you want the change to take place
    editor.dispatch({
        effects: addHighlight.of([highlight_decoration.range(from, to)])
    });
}

function highlightEnd(editor: EditorView, at: number): void {
    editor.dispatch({
        effects: addHighlight.of([end_decoration.range(at, at)])
    });
}

function removeHighlights(editor: EditorView): void {
    editor.dispatch({
        effects: removeHighlight.of(() => false)
    });
}

export type ParameterChangeListener = (parameterIndex: number, isLast: boolean) => void;

export class ParameterizedCompletion {
    private readonly tc: EditorView;
    private parameterChangeListener: ParameterChangeListener | undefined = undefined;

    constructor(tc: EditorView) {
        this.tc = tc;
    }

    setParameterChangeListener(l: ParameterChangeListener): void {
        this.parameterChangeListener = l;
    }

    replaceSelection(autocompletion: string): void {
        const parsedParams: ParsedParam[] = [];
        const insertionString = ParameterizedCompletion.parseParameters(autocompletion, parsedParams);
        const offset = this.tc.state.selection.main.anchor;
        this.tc.dispatch(this.tc.state.replaceSelection(insertionString));
        removeHighlights(this.tc);
        for(let pp of parsedParams) {
            highlight(this.tc, offset + pp.i0, offset + pp.i1);
        }
        const atEnd = offset + insertionString.length;
        highlightEnd(this.tc, atEnd);
        this.cycle(0);
    }

    next(): void {
        const ds: DecorationSet = this.tc.state.field(highlight_extension);
        let it: RangeCursor<Decoration> = ds.iter(0);
        let cursor: number = this.tc.state.selection.main.head;
        // iterate over all parameters (ranges)
        let i = 0;
        while(it.value !== null) {
            if(cursor < it.from || i === ds.size - 1) {
                this.cycle(i);
                return;
            }
            it.next();
            i++;
        }
    }

    previous(): void {
        const ds: DecorationSet = this.tc.state.field(highlight_extension);
        let it: RangeCursor<Decoration> = ds.iter(0);
        let cursor: number = this.tc.state.selection.main.head;
        // iterate over all parameters (ranges)
        let i = 0;
        while(it.value !== null) {
            if(cursor <= it.to) {
                this.cycle(i - 1);
                return;
            }
            it.next();
            i++;
        }
        this.cycle(i - 1); // needed in case the cursor is behind the last mark
    }

    cycle(currentParameterIndex: number): void {
        const ds: DecorationSet = this.tc.state.field(highlight_extension);
        const nParameters = ds.size;
        if(nParameters === 0)
            return;

        if(currentParameterIndex === -1)
            return;

        let it: RangeCursor<Decoration> = ds.iter(0);
        for(let i = 0; i < nParameters && i < currentParameterIndex; i++) {
            it.next();
        }
        const last = currentParameterIndex === nParameters - 1

        // const from: number = last ? it.from + 1 : it.from;
        const from = it.from;
        this.tc.dispatch({selection: {anchor: from, head: it.to}});


        if(this.parameterChangeListener !== undefined) {
            this.parameterChangeListener(currentParameterIndex, last);
        }

        // if(last)
        //     this.cancel();
    }

    cancel(): void {
        removeHighlights(this.tc);
        this.parameterChangeListener = undefined;
    }

    handleKeyEvent(event: KeyboardEvent): void {
        if(this.tc.state.field(highlight_extension).size == 0) {
            this.cancel();
            return;
        }
        if (event.key === "Tab" || event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) {
                this.previous();
            }
            else {
                this.next();
            }
        }
        else if (event.key === "Escape") {
            event.preventDefault();
            this.cancel();
        }
    }

    static parseParameters(paramString: string, ret: ParsedParam[]): string {
        let varName: string | undefined = undefined;
        let insertString = "";
        const l = paramString.length;
        let hlStart = -1;
        let i = 0;
        while(i < l) {
            let cha = paramString[i];
            if(cha === '$' && i < l - 1 && paramString[i + 1] === '{') {
                if(varName === undefined) {
                    varName = "";
                    hlStart = insertString.length;
                    i = i + 1;
                }
                else {
                    throw new Error("Expected '}' before next '${'");
                }
            }
            else if(varName !== undefined && cha === '}') {
                const hlEnd = insertString.length;
                ret.push(new ParsedParam(varName, hlStart, hlEnd)); // hlEnd is exclusive
                varName = undefined;
            }

            else if(varName !== undefined) {
                varName = varName + cha;
                insertString = insertString + cha;
            }
            else {
                insertString = insertString + cha;
            }
            i = i + 1;
        }
        return insertString;
    }
}

export class ParsedParam {

    readonly name: string;
    readonly i0: number;
    readonly i1: number;

    constructor(name: string, i0: number, i1: number) {
        this.name = name;
        this.i0 = i0;
        this.i1 = i1;
    }
}
