import { Parser } from "./Parser";
import { ACEditor } from "./ui/ACEditor";
import { makeMicroscopeParser } from "./microscope/LanguageControl";

export * from "./core/index";
export * from "./ebnf/index";
export * from "./util/index";
export * from "./microscope/index";
export * from "./ui/index";
export * from "./Autocompleter";
export * from "./Evaluator";
export * from "./ParsedNode";
export * from "./Parser";
export * from "./ParseException";


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


// const parser = makeMicroscopeParser();
// const parser = makeSimpleParser();

// const editor = new ACEditor(parser, document.body);
