# nlScript: Natural Language Scripting

This is the Javascript version of nlScript.

The Natural Language Scripting (nlScript) library provides a framework for replacing graphical user interfaces (GUIs) with a unifiedscripting interface based on natural language.

It provides all the tools necessary for creating domain-specific languages with a natural English syntax for any application:
* Means to define custom lanugage sentences conveniently.
* Define for each language expression what should happen upon parsing it.
* A ready editor to be displayed to the user, equipped with autocompletion based on the defined language.
* Integrated parsing engine and evaluation environment.
* Tools for debugging the language.
* Integrated Error handling



## Basic usage

The Natural Language Scripting framework offers a convenient way to define the sentences your interface should understand, and provides an auto-completion enabled text editor for users to enter their instructions. The following code snippet shows how to create a parser, how to define a pattern for a sentence for it to parse, and how to display the editor:

```html
<!doctype html>
<html>
  <body>
    <!-- The HTML element that will hold the editor -->
    <div id="nls-container"></div>

    <!-- The only javascript file needed for nlScript -->
    <script src="index.cjs"></script>

    <!-- Load the library for the actual processing -->
    <script src="preprocessing.js"></script>

    <script>
      // Create an instance of the preprocessing backend.
      let preprocessing = new Preprocessing("output");

      let parser = new nlScript.Parser();
      parser.defineSentence(
        "Apply Gaussian blurring with a standard deviation of {stddev:float} pixel(s).",

        // The function specified here will be called upon parsing the sentence above
        pn => {

          // The argument given to evaluate(), a ParsedNode, can be used to
          // evaluate the value of the sentence's variables, here 'stddev'.
          // They are accessed by name.
          let stdDev = pn.evaluate("stddev");

          // Do the ctual blurring, using the processing backend.
          preprocessing.gaussianBlur(stdDev);

          // Update the output image
          preprocessing.show("output");
          return undefined;
        });

      new nlScript.ACEditor(parser, document.getElementById("nls-container"));
    </script>
  </body>
</html>
```

In this example we state that we expect a literal "Apply Gaussian blurring with a standard deviation of ", followed by a floating point number, which we name "stddev" for later reference, followed by the literal "pixel(s).".



## Motivation
Graphical user interfaces can easily become complex and confusing as the number of user input parameters increases. This is particularly true if a workflow needs to be configured, where (i) each step has its own set of parameters, (ii) steps can occur in any order and (iii) steps can be repeated arbitrarily. Consider the configuration of an image pre-processing workflow, which consists of the following algorithms, each having its own set of parameters:
- Gaussian blurring (standard deviation)
- Median filtering (window radius)
- Background subtraction (window radius)
- Conversion to grayscale
- Intensity normalization

A traditional graphical user interface (GUI) could e.g. look like this:

![](https://nlscript.github.io/Bla/images/Screenshot-00.png)


where the user can activate the various algorithms and specify their parameters as necessary. This user interface however does not take into account that different algorithms could occur repeatedly, and it does not allow to change the order.

Using Natural Language Scripting, we want to implement a text-based interface which reads and executes text like:
```bash
Apply Gaussian blurring with a standard deviation of 3 pixel(s).
Subtract the background with a window readius of 30 pixel(s).
Apply Median filtering with a window radius of 1 pixel(s).
Normalize intensities.
Apply Gaussian blurring with a standard deviation of 1 pixel(s).
```


## More information

* [A step-by-step tutorial](https://nlScript.github.io/nlScript-tutorial-js)
* [Explanations for it](https://nlScript.github.io/nlScript-java)
* [Details how to define variables](https://nlScript.github.io/nlScript-java/variables.html)
* [Built-in types apart from `float`](https://nlScript.github.io/nlScript-java/#built-in-types)
* [More detail about custom types](https://nlScript.github.io/nlScript-java/custom-types.html)


## Development information

### Build bundle

Browser version:
```
npx webpack -c webpack-umd.config.js
```

Node.js version:
```
npx webpack -c webpack-ems.config.js
```

### Run all tests
```
./node_modules/.bin/jest
```

### Run a specific test
```
./node_modules/.bin/jest TestAutocompletion
```




