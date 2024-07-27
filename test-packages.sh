#!/bin/bash

TMPDIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'TMPDIR')
echo $TMPDIR
currDir=`pwd`
currDirWin=`pwd -W`


## CommonJS

cd $TMPDIR
mkdir -p cjs && cd cjs
npm init -y
npm install $currDir

cat <<EOF > index.js
l = require('@nlScript/nlScript');

// console.log(l);

let parser = new l.Parser()
parser.defineType("my-color", "blue", undefined);
parser.defineType("my-color", "green", undefined);
parser.defineSentence("My favourite color is {color:my-color}.", undefined);

let autocompletions = []
parser.parse("My favourite color is ", autocompletions);
console.log(autocompletions);
EOF

node index.js




## ESM

cd $TMPDIR
mkdir -p esm && cd esm
npm init -y
npm pkg set type="module"
npm install $currDir

cat <<EOF > index.js
import { Parser }  from '@nlscript/nlScript';

// console.log(Parser);

let parser = new Parser()
parser.defineType("my-color", "blue", undefined);
parser.defineType("my-color", "green", undefined);
parser.defineSentence("My favourite color is {color:my-color}.", undefined);

let autocompletions = []
parser.parse("My favourite color is ", autocompletions);
console.log(autocompletions);
EOF

node index.js




## Typescript

cd $TMPDIR
mkdir ts && cd ts
npm init -y
npm install $currDir
npm install --save-dev typescript ts-loader

cat <<EOF > index.ts
import { Parser, Autocompletion }  from '@nlscript/nlScript';

// console.log(Parser);

const parser = new Parser()
parser.defineType("my-color", "blue", undefined);
parser.defineType("my-color", "green", undefined);
parser.defineSentence("My favourite color is {color:my-color}.", undefined);

const autocompletions: Autocompletion[] = [];
parser.parse("My favourite color is ", autocompletions);
console.log(autocompletions);
EOF

npx tsc --init
npx tsc
node index.js



## Browser/umd

cd $TMPDIR
mkdir umd && cd umd
cat <<EOF >  index.html
<!doctype html>
<html>
  <body>
    <!-- The HTML element that will hold the editor -->
    <div width="800" height="600" id="nls-container"></div>

    <!-- The only javascript file needed for nlScript -->
    <script src="file://$currDirWin/dist/umd/nlScript.js"></script>

    <script>
      let parser = new nlScript.Parser();
      parser.defineType("my-color", "blue", undefined);
      parser.defineType("my-color", "green", undefined);
      parser.defineSentence("My favourite color is {color:my-color}.", undefined);

      new nlScript.ACEditor(parser, document.getElementById("nls-container"));
    </script>
  </body>
</html>
EOF

start index.html


