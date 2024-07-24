import { Parser } from "./Parser.js";
import { ACEditor } from "./ui/ACEditor.js";

export * from "./core/index.js";
export * from "./ebnf/index.js";
export * from "./util/index.js";
export * from "./ui/index.js";
export * from "./Autocompleter.js";
export * from "./Evaluator.js";
export * from "./ParsedNode.js";
export * from "./Parser.js";
export * from "./ParseException.js";


function makeSimpleParser(): Parser {
    const parser = new Parser();

    parser.defineType("my-color", "blue", undefined);
    parser.defineType("my-color", "green", undefined);
    parser.defineType("my-color", '({r:int}, {g:int}, {b:int})', undefined, true);
    parser.defineType("two-numbers", "{n1:int} and {n2:int}", undefined, true);
    
    parser.defineSentence("My favourite color is {color:my-color}.", undefined);
    parser.defineSentence("I like {two-numbers:two-numbers}.", undefined);
    return parser;
}


// const parser = makeSimpleParser();

// const editor = new ACEditor(parser, document.body);
