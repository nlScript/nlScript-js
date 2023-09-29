import { Parser } from "../Parser";
import { IfNothingYetEnteredAutocompleter } from "../Autocompleter";


export function makeMicroscopeParser(): Parser {

    let parser = new Parser();

    const definedChannels: string[] = [];
    const definedRegions: string[] = [];

    parser.addParseStartListener(() => {
        definedChannels.length = 0;
        definedRegions.length = 0;
    });


    parser.defineType("led", "385nm", _e => 385);
    parser.defineType("led", "470nm", _e => 470);
    parser.defineType("led", "567nm", _e => 567);
    parser.defineType("led", "625nm", _e => 625);

    parser.defineType("led-power", "{<led-power>:int}%", e => e.evaluate("<led-power>"), true);

    parser.defineType("exposure-time", "{<exposure-time>:int}ms", e => e.evaluate("<exposure-time>"), true);

    parser.defineType("led-setting", "{led-power:led-power} at {wavelength:led}", e => {
        const power = e.evaluate("led-power");
        const led = e.evaluate("wavelength");
        return { led: led, power: power };
    }, true);

    parser.defineType("another-led-setting", ", {led-setting:led-setting}", e => e.evaluate("led-setting"), true);

    parser.defineType("channel-name", "'{<name>:[A-Za-z0-9]:+}'", e => e.getParsedString("<name>"), new IfNothingYetEnteredAutocompleter("'${name}'"));

    parser.defineSentence(
        "Define channel {channel-name:channel-name}:" +
        "{\n  }excite with {led-setting:led-setting}{another-led-setting:another-led-setting:0-3}" +
        "{\n  }use an exposure time of {exposure-time:exposure-time}.",
        undefined
    ).onSuccessfulParsed(n => {
        definedChannels.push(n.getParsedString("channel-name"));
    });



    parser.defineType("region-name", "'{<region-name>:[a-zA-Z0-9]:+}'", undefined, new IfNothingYetEnteredAutocompleter("'${region-name}'"));

    parser.defineType("region-dimensions", "{<width>:float} x {<height>:float} x {<depth>:float} microns", undefined, true);
    parser.defineType("region-center", "{<center>:tuple<float,x,y,z>} microns", undefined, true);
    parser.defineType("sentence",
            "Define a position {region-name:region-name}:" +
            "{\n  }{region-dimensions:region-dimensions}" +
            "{\n  }centered at {region-center:region-center}.",
            undefined
    ).onSuccessfulParsed(n => {
        definedRegions.push(n.getParsedString("region-name"));
    });

    parser.defineType("defined-channels", "'{channel:[A-Za-z0-9]:+}'",
            _e => undefined,
            { getAutocompletion: _e => definedChannels.join(";;;")});

    parser.defineType("defined-positions", "'{position:[A-Za-z0-9]:+}'",
            e => e.getParsedString("position"),
            { getAutocompletion: _e => definedRegions.join(";;;")});

    parser.defineType("time-unit", "second(s)", _e => 1);
    parser.defineType("time-unit", "minute(s)", _e => 60);
    parser.defineType("time-unit", "hour(s)",   _e => 3600);

    parser.defineType("time-interval", "{n:float} {time-unit:time-unit}", e => {
        const n: number = e.evaluate("n");
        const unit: number = e.evaluate("time-unit");
        const seconds: number = Math.round(n * unit);
        return seconds;
    }, true);

    parser.defineType("repetition", "once", _e =>  [1, 0]);

    parser.defineType("repetition", "every {interval:time-interval} for {duration:time-interval}", e => {
        const interval: number = e.evaluate("interval");
        const duration: number = e.evaluate("duration");
        return [ interval, duration ];
    }, true);

    parser.defineType("z-distance", "{z-distance:float} microns", undefined, true);

    parser.defineType("lens",  "5x lens", undefined);
    parser.defineType("lens", "20x lens", undefined);

    parser.defineType("mag", "0.5x magnification changer", undefined);
    parser.defineType("mag", "1.0x magnification changer", undefined);
    parser.defineType("mag", "2.0x magnification changer", undefined);

    parser.defineType("binning", "1 x 1", _e => 1);
    parser.defineType("binning", "2 x 2", _e => 2);
    parser.defineType("binning", "4 x 4", _e => 4);
    parser.defineType("binning", "8 x 8", _e => 8);

    parser.defineType("temperature", "{temperature:float}\u00B0C", undefined, true);
    parser.defineType("co2-concentration", "{CO2 concentration:float}%", undefined, true);

    parser.defineType("incubation",
            "set the temperature to {temperature:temperature}",
            undefined);

    parser.defineType("incubation",
            "set the CO2 concentration to {co2-concentration:co2-concentration}",
            undefined);

    parser.defineType("acquisition",
            "acquire..." +
                    "{\n  }every {interval:time-interval} for {duration:time-interval}" +
                    "{\n  }position(s) {positions:list<defined-positions>}" +
                    "{\n  }channel(s) {channels:list<defined-channels>}" +
    //				"{\n  }with a resolution of {dx:float} x {dy:float} x {dz:float} microns.",
                    "{\n  }with a plane distance of {dz:z-distance}" +
                    "{\n  }using the {lens:lens} with the {magnification:mag} and a binning of {binning:binning}",
            undefined);


    parser.defineType("start", "At the beginning",            undefined);
    parser.defineType("start", "At {time:time}",              undefined, true);
    parser.defineType("start", "After {delay:time-interval}", undefined, true);

    parser.defineSentence("{start:start}, {acquisition:acquisition}.", undefined);

    parser.defineSentence("{start:start}, {incubation:incubation}.", undefined);

    return parser;
}
