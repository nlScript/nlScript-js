import { StateEffect, StateField, Range, RangeCursor } from "@codemirror/state"
import { Decoration, DecorationSet, WidgetType } from "@codemirror/view"
import { EditorView } from "codemirror";

// code mirror effect that you will use to define the effect you want (the decoration)
const addErrorEffect = StateEffect.define<Range<Decoration>[]>();
const removeErrorEffect = StateEffect.define<(from: number, to: number, value: any) => boolean>();

// define a new field that will be attached to your view state as an extension, update will be called at each editor's change
export const error_highlight_extension = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(value, transaction) {
    value = value.map(transaction.changes)

    for (let effect of transaction.effects) {
      if (effect.is(addErrorEffect)) value = value.update({add: effect.value, sort: true})
      else if (effect.is(removeErrorEffect)) value = value.update({filter: effect.value})
    }

    return value
  },
  provide: f => EditorView.decorations.from(f),
});


// this is your decoration where you can define the change you want : a css class or directly css attributes
const error_decoration = Decoration.mark({
  inclusive: true,
  attributes: {style: "/* background-color: #b7c1e8; border: red 1px solid; */ color: red; font-weight: bold; "},
  tagName: "span",

  // class: 'red_back'
});

function highlightError(editor: EditorView, from: number, to: number): void {
    // this is where the change takes effect by the dispatch. The of method instanciate the effect. You need to put this code where you want the change to take place
    editor.dispatch({
        effects: addErrorEffect.of([error_decoration.range(from, to)])
    });
}

function removeErrors(editor: EditorView): void {
    editor.dispatch({
        effects: removeErrorEffect.of(() => false)
    });
}

export type ParameterChangeListener = (parameterIndex: number, isLast: boolean) => void;

export class ErrorHighlight {
    private readonly tc: EditorView;
    private parameterChangeListener: ParameterChangeListener | undefined = undefined;

    constructor(tc: EditorView) {
        this.tc = tc;
    }

    setError(i0: number, i1: number): void {
        this.clearError();
        highlightError(this.tc, i0, i1);
    }

    clearError(): void {
        removeErrors(this.tc);
    }
}
