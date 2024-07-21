import { ParsedNode } from "src/ParsedNode.js";
import { Autocompleter, EntireSequenceCompleter, IfNothingYetEnteredAutocompleter } from "../Autocompleter.js";
import { Terminal } from "../core/Terminal.js";
import { IntRange } from "../util/IntRange.js";
import { EBNFCore } from "./EBNFCore.js";
import { Rule } from "./Rule.js";
import { Autocompletion } from "src/core/Autocompletion.js";

export class EBNF extends EBNFCore {

    static readonly DIGIT_NAME          : string = Terminal.DIGIT.getSymbol();
    static readonly LETTER_NAME         : string = Terminal.LETTER.getSymbol();
    static readonly SIGN_NAME           : string = "sign";
    static readonly INTEGER_NAME        : string = "int";
	static readonly FLOAT_NAME          : string = "float";
    static readonly MONTH_NAME          : string = "month";
    static readonly WEEKDAY_NAME        : string = "weekday";
	static readonly WHITESPACE_STAR_NAME: string = "whitespace-star";
	static readonly WHITESPACE_PLUS_NAME: string = "whitespace-plus";
	static readonly INTEGER_RANGE_NAME  : string = "integer-range";
	static readonly PATH_NAME           : string = "path";
	static readonly TIME_NAME           : string = "time";
    static readonly DATE_NAME           : string = "date";
    static readonly DATETIME_NAME       : string = "date-time";
	static readonly COLOR_NAME          : string = "color";

    readonly SIGN: Rule;
	readonly INTEGER: Rule;
	readonly FLOAT: Rule;
    readonly MONTH: Rule;
    readonly WEEKDAY: Rule;
	readonly WHITESPACE_STAR: Rule;
	readonly WHITESPACE_PLUS: Rule;
	readonly INTEGER_RANGE: Rule;
	// readonly PATH: Rule; // TODO implement
	readonly TIME: Rule;
    readonly DATE: Rule;
    readonly DATETIME: Rule;
	readonly COLOR: Rule;

    constructor() {
        super();
        this.SIGN            = this.makeSign();
        this.INTEGER         = this.makeInteger();
		this.FLOAT           = this.makeFloat();
        this.MONTH           = this.makeMonth();
        this.WEEKDAY         = this.makeWeekday();
		this.WHITESPACE_STAR = this.makeWhitespaceStar();
		this.WHITESPACE_PLUS = this.makeWhitespacePlus();
		this.INTEGER_RANGE   = this.makeIntegerRange();
		// this.PATH            = this.makePath();
		this.TIME            = this.makeTime();
        this.DATE            = this.makeDate();
        this.DATETIME        = this.makeDatetime();
		this.COLOR           = this.makeColor();
        this.symbols.set(Terminal.DIGIT.getSymbol(), Terminal.DIGIT);
        this.symbols.set(Terminal.LETTER.getSymbol(), Terminal.LETTER);
    }

    // static clearFilesystemCache() {
    // TODO implement
    //     EBNF.pathAutocompleter.clearFilesystemCache();
    // }

    private makeSign(): Rule {
        return this.or(EBNF.SIGN_NAME,
            Terminal.literal("-").withName(),
            Terminal.literal("+").withName()
        );
    }

    private makeInteger(): Rule {
        // int -> (-|+)?digit+
		const ret: Rule = this.sequence(EBNF.INTEGER_NAME,
            this.optional(undefined, this.SIGN.withName("sign")).withName("optional"),
            this.plus(undefined, Terminal.DIGIT.withName("digit")).withName("plus")
        );
        ret.setEvaluator(pn => parseInt(pn.getParsedString()));
        ret.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);
        return ret;
    }

    private makeFloat(): Rule {
        const ret: Rule = this.sequence(EBNF.FLOAT_NAME,
            this.optional(undefined, this.SIGN.withName()).withName(),
            this.plus(undefined, Terminal.DIGIT.withName()).withName(),
            this.optional(undefined,
                this.sequence(undefined,
                    Terminal.literal(".").withName(),
                    this.star(undefined, Terminal.DIGIT.withName()).withName("star")
                ).withName("sequence")
            ).withName()
        );
        ret.setEvaluator(pn => parseFloat(pn.getParsedString()));
        ret.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);
        return ret;
    }

    private makeWhitespaceStar(): Rule {
        const ret: Rule = this.star(EBNF.WHITESPACE_STAR_NAME, Terminal.WHITESPACE.withName());
        ret.setAutocompleter(new IfNothingYetEnteredAutocompleter(" ", ""));
        return ret;
    }

    private makeWhitespacePlus(): Rule {
        const ret: Rule = this.plus(EBNF.WHITESPACE_PLUS_NAME, Terminal.WHITESPACE.withName());
        ret.setAutocompleter(new IfNothingYetEnteredAutocompleter(" ", ""));
        return ret;
    }

    private makeIntegerRange(): Rule {
        const delimiter: Rule = this.sequence(undefined,
            this.WHITESPACE_STAR.withName("ws*"),
            Terminal.literal("-").withName(),
            this.WHITESPACE_STAR.withName("ws*")
        );
        const ret: Rule = this.join(EBNF.INTEGER_RANGE_NAME,
            this.INTEGER.withName(),
            undefined,
            undefined,
            delimiter.getTarget(),
            true,
            ["from", "to"]
        );
        ret.setEvaluator(pn => new IntRange(parseInt(pn.evaluate(0)), parseInt(pn.evaluate(1))));
        return ret;
    }

    private makeColor(): Rule {
        const black      : Rule = this.sequence(undefined, Terminal.literal("black"       ).withName()).setEvaluator(_pn => EBNF.rgb2int(  0,   0,   0));
		const white      : Rule = this.sequence(undefined, Terminal.literal("white"       ).withName()).setEvaluator(_pn => EBNF.rgb2int(255, 255, 255));
		const red        : Rule = this.sequence(undefined, Terminal.literal("red"         ).withName()).setEvaluator(_pn => EBNF.rgb2int(255,   0,   0));
		const orange     : Rule = this.sequence(undefined, Terminal.literal("orange"      ).withName()).setEvaluator(_pn => EBNF.rgb2int(255, 128,   0));
		const yellow     : Rule = this.sequence(undefined, Terminal.literal("yellow"      ).withName()).setEvaluator(_pn => EBNF.rgb2int(255, 255,   0));
		const lawngreen  : Rule = this.sequence(undefined, Terminal.literal("lawn green"  ).withName()).setEvaluator(_pn => EBNF.rgb2int(128, 255,   0));
		const green      : Rule = this.sequence(undefined, Terminal.literal("green"       ).withName()).setEvaluator(_pn => EBNF.rgb2int(  0, 255,   0));
		const springgreen: Rule = this.sequence(undefined, Terminal.literal("spring green").withName()).setEvaluator(_pn => EBNF.rgb2int(  0, 255, 180));
		const cyan       : Rule = this.sequence(undefined, Terminal.literal("cyan"        ).withName()).setEvaluator(_pn => EBNF.rgb2int(  0, 255, 255));
		const azure      : Rule = this.sequence(undefined, Terminal.literal("azure"       ).withName()).setEvaluator(_pn => EBNF.rgb2int(  0, 128, 255));
		const blue       : Rule = this.sequence(undefined, Terminal.literal("blue"        ).withName()).setEvaluator(_pn => EBNF.rgb2int(  0,   0, 255));
		const violet     : Rule = this.sequence(undefined, Terminal.literal("violet"      ).withName()).setEvaluator(_pn => EBNF.rgb2int(128,   0, 255));
		const magenta    : Rule = this.sequence(undefined, Terminal.literal("magenta"     ).withName()).setEvaluator(_pn => EBNF.rgb2int(255,   0, 255));
		const pink       : Rule = this.sequence(undefined, Terminal.literal("pink"        ).withName()).setEvaluator(_pn => EBNF.rgb2int(255,   0, 128));
		const gray       : Rule = this.sequence(undefined, Terminal.literal("gray"        ).withName()).setEvaluator(_pn => EBNF.rgb2int(128, 128, 128));

        const custom: Rule = this.tuple(undefined, this.INTEGER.withName(), "red", "green", "blue");

        return this.or(EBNF.COLOR_NAME,
            custom.withName(),
            black.withName(),
            white.withName(),
            red.withName(),
            orange.withName(),
            yellow.withName(),
            lawngreen.withName(),
            green.withName(),
            springgreen.withName(),
            cyan.withName(),
            azure.withName(),
            blue.withName(),
            violet.withName(),
            magenta.withName(),
            pink.withName(),
            gray.withName());
    }

    private static rgb2int(r: number, g: number, b: number): number {
        return (0xff << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
    }

    private makeTime(): Rule {
        const hour: Rule = this.sequence(undefined,
            this.optional(undefined, Terminal.DIGIT.withName()).withName(),
            Terminal.DIGIT.withName());
        hour.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);

        const minute: Rule = this.sequence(undefined,
            Terminal.DIGIT.withName(),
			Terminal.DIGIT.withName());
        minute.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);

		const ret: Rule = this.sequence(EBNF.TIME_NAME,
            hour.withName("HH"),
            Terminal.literal(":").withName(),
			minute.withName("MM"));

		ret.setEvaluator(pn => EBNF.parseTime(pn.getParsedString()));
		ret.setAutocompleter(new EntireSequenceCompleter(this, new Map<string, Autocompletion[]>()));
		return ret;
	}

    private makeMonth(): Rule {
        return this.or(EBNF.MONTH_NAME,
            this.sequence(undefined, Terminal.literal("January")  .withName()).setEvaluator(_pn =>  0).withName("january"),
            this.sequence(undefined, Terminal.literal("February") .withName()).setEvaluator(_pn =>  1).withName("february"),
            this.sequence(undefined, Terminal.literal("March")    .withName()).setEvaluator(_pn =>  2).withName("march"),
            this.sequence(undefined, Terminal.literal("April")    .withName()).setEvaluator(_pn =>  3).withName("april"),
            this.sequence(undefined, Terminal.literal("May")      .withName()).setEvaluator(_pn =>  4).withName("may"),
            this.sequence(undefined, Terminal.literal("June")     .withName()).setEvaluator(_pn =>  5).withName("june"),
            this.sequence(undefined, Terminal.literal("July")     .withName()).setEvaluator(_pn =>  6).withName("july"),
            this.sequence(undefined, Terminal.literal("August")   .withName()).setEvaluator(_pn =>  7).withName("august"),
            this.sequence(undefined, Terminal.literal("September").withName()).setEvaluator(_pn =>  8).withName("september"),
            this.sequence(undefined, Terminal.literal("October")  .withName()).setEvaluator(_pn =>  9).withName("october"),
            this.sequence(undefined, Terminal.literal("November") .withName()).setEvaluator(_pn => 10).withName("november"),
            this.sequence(undefined, Terminal.literal("December") .withName()).setEvaluator(_pn => 11).withName("december"),
            );
    }

    private makeWeekday(): Rule {
        return this.or(EBNF.WEEKDAY_NAME,
            this.sequence(undefined, Terminal.literal("Monday")   .withName()).setEvaluator(_pn =>  0).withName("monday"),
            this.sequence(undefined, Terminal.literal("Tuesday")  .withName()).setEvaluator(_pn =>  1).withName("tuesday"),
            this.sequence(undefined, Terminal.literal("Wednesday").withName()).setEvaluator(_pn =>  2).withName("wednesday"),
            this.sequence(undefined, Terminal.literal("Thursday") .withName()).setEvaluator(_pn =>  3).withName("thursday"),
            this.sequence(undefined, Terminal.literal("Friday")   .withName()).setEvaluator(_pn =>  4).withName("friday"),
            this.sequence(undefined, Terminal.literal("Saturday") .withName()).setEvaluator(_pn =>  5).withName("saturday"),
            this.sequence(undefined, Terminal.literal("Sunday")   .withName()).setEvaluator(_pn =>  6).withName("sunday"),
            );
    }

    private makeDate(): Rule {
        const day: Rule = this.sequence(undefined,
            this.optional(undefined, Terminal.DIGIT.withName()).withName(),
            Terminal.DIGIT.withName());
        day.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);
        day.setEvaluator(pn => parseInt(pn.getParsedString()));

        const year: Rule = this.sequence(undefined,
            Terminal.DIGIT.withName(),
            Terminal.DIGIT.withName(),
            Terminal.DIGIT.withName(),
            Terminal.DIGIT.withName(),
        );
        year.setAutocompleter(Autocompleter.DEFAULT_INLINE_AUTOCOMPLETER);
        year.setEvaluator(pn => parseInt(pn.getParsedString()));


        const ret: Rule = this.sequence(EBNF.DATE_NAME,
            day.withName("day"),
            Terminal.literal(" ").withName(),
            this.MONTH.withName("month"),
            Terminal.literal(" ").withName(),
            year.withName("year")
        );
        ret.setEvaluator(pn => {
            const day: number = pn.evaluate("day");
            const month: number = pn.evaluate("month");
            const year: number = pn.evaluate("year");
            let date: Date = new Date();
            date.setDate(day);
            date.setMonth(month);
            date.setFullYear(year);
            date.setHours(0, 0, 0, 0);
            return date;
        });
        ret.setAutocompleter(new EntireSequenceCompleter(this, new Map<string, Autocompletion[]>()));
        return ret;
    }

    private makeDatetime(): Rule {
        const ret: Rule = this.sequence(EBNF.DATETIME_NAME,
            this.DATE.withName("date"),
            Terminal.literal(" ").withName(),
            this.TIME.withName("time"));

        ret.setEvaluator(pn => {
            let date: Date = pn.evaluate("date");
            let time: Date = pn.evaluate("time");
            date.setHours(time.getHours());
            date.setMinutes(time.getMinutes());
            date.setSeconds(time.getSeconds());
            date.setMilliseconds(time.getMilliseconds());
            return date;
        });
        ret.setAutocompleter(new EntireSequenceCompleter(this, new Map<string, Autocompletion[]>));
        return ret;
    }

    private static parseTime(time: string): Date {
        const toks: string[] = time.split(":");
        if(toks.length != 2)
            throw new Error("Failed to parse " + time);
        const h: number = parseInt(toks[0]);
        const m: number = parseInt(toks[1]);

        if(h === undefined || h < 0 || h > 23)
            throw new Error("Failed to parse " + time);
        if(m === undefined || m < 0 || m > 59)
            throw new Error("Failed to parse " + time);
        const d = new Date();
        d.setHours(h);
        d.setMinutes(m);
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d;
    }

    // TODO path
}
