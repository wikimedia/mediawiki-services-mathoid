# Mathoid-server

[![Build Status][1]][2] [![dependency status][3]][4] [![dev dependency status][5]][6] [![Coverage Status][7]][8]

[![NPM](https://nodei.co/npm/mathoid.png)](https://nodei.co/npm/mathoid/)

Mathoid-server is a service that uses MathJax and PhantomJS to create SVGs and MathML on server side.
Mathoid-server is a based on svgtex - https://github.com/agrbin/svgtex.



## Installation
Install node 4.2.3, iojs-v2.5.0 or a compatible node version and npm version 2.14.7 or similar.
In addition the prerequisites from [librsvg](https://www.npmjs.com/package/librsvg#installation) are needed.
For Debian based systems installing the `librsvg2-dev` should be sufficient.
```bash
sudo apt-get install librsvg2-dev
```
Thereafter, install mathoid by running
```bash
npm install mathoid
nodejs /node_modules/mathoid/server.js
```
To install mathoid as a unix service there is a [script](scripts/gen-init-scripts.rb).

### Running the tests
To run the tests you need to install mocha.
After that you can run the tests from the mathoid folder.
```bash
npm test
```

## API Description

The main entry point is '/' with one required POST parameter 'q'.

Additional entry points for individual formats are
* /texvcinfo does not do any rendering. Only displays information regarding the texvc input.
* /speech returns the speech output only
* /mml only MathML
* /svg only SVG
* /png only PNG
* /json (same as /)
* /complete (see below)

The 'complete' output format is equal to the 'json' one except that it also
includes the headers for individual types in the response body as well. The
output specification is identical, except that the 'mml', 'svg' and 'png' fields
are now (JSON) objects containing the 'body' and 'headers' fields.

#### q (input to be converted)

* required parameter
* no $ for (La)TeX input

#### type (the input type)
* optional
* defalult 'tex'
* possible values
  * tex (texvc input will be verified by texvccheck)
  * inline-tex (texvc input will be rendered with small operators)
  * mml (MathML input, used in latexml rendering mode)
  * ascii (ascii mathml input, experimental)

#### nospeech
* optional
* if speech output is enabled this switch suppresses speech output for one particular request

## Config
* svg: creates and svg image (turned on by default)
* img: creates a img element with dimension information about the svg image
* png: creates png images using java
* speech: creates speech output using speech rule engine
* texvcinfo: displays information regarding the texvc input (experimental)
* speechOn: default setting for speech output. 'true' is equivalent to the old speakText.

## Performance
The performance tests can be run by executing the [performance.sh](scripts/performance.sh) script.

On our labs-vagrant test instance with 8 workers and 100 request the following results were obtained
for the input $E = m c^2$:

|format                                      |time|    sd|
|--------------------------------------------|----|------|
| [texvcinfo](doc/test_results/performance_texvcinfo.txt) |0005|003.2|
| [mml](doc/test_results/performance_mml.txt)             |0334|061.2|
| [svg](doc/test_results/performance_svg.txt)             |0343|058.6|
| [png](doc/test_results/performance_png.txt)             |0027|007.2|

|format (without speech support)               |time|    sd|
|----------------------------------------------|----|------|
| [texvcinfo](doc/test_results/ns/performance_texvcinfo.txt) |0005|003.0|
| [mml](doc/test_results/ns/performance_mml.txt)             |0030|004.5|
| [svg](doc/test_results/ns/performance_svg.txt)             |0030|004.2|
| [png](doc/test_results/ns/performance_png.txt)             |0030|005.7|
The time, i.e. "Total Connection Times" were measured in unit ms.
## Create a new release

Checkout the latest version and switch to the master branch:
* git-dch -R -N version
* git-buildpackage --git-tag -S

see also https://wikitech.wikimedia.org/wiki/Git-buildpackage

publish as ppa
* dput ppa:physikerwelt/mathoid ../version.changes

## Tests
Based on the Template for creating MediaWiki Services in Node.js
The template also includes a test suite a small set of executable tests. To fire
them up, simply run:

```
npm test
```

If you haven't changed anything in the code (and you have a working Internet
connection), you should see all the tests passing. As testing most of the code
is an important aspect of service development, there is also a bundled tool
reporting the percentage of code covered. Start it with:

```
npm run-script coverage
```

### Troubleshooting

In a lot of cases when there is an issue with node it helps to recreate the
`node_modules` directory:

```
rm -r node_modules
npm install
```

[1]: https://travis-ci.org/physikerwelt/mathoid-server.svg
[2]: https://travis-ci.org/physikerwelt/mathoid-server
[3]: https://david-dm.org/physikerwelt/mathoid-server.svg
[4]: https://david-dm.org/physikerwelt/mathoid-server
[5]: https://david-dm.org/physikerwelt/mathoid-server/dev-status.svg
[6]: https://david-dm.org/physikerwelt/mathoid-server#info=devDependencies
[7]: https://img.shields.io/coveralls/physikerwelt/mathoid-server.svg
[8]: https://coveralls.io/r/physikerwelt/mathoid-server
