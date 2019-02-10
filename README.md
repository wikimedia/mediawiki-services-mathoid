# Mathoid

[![Build Status][1]][2] [![dependency status][3]][4] [![dev dependency status][5]][6] [![Coverage Status][7]][8]

[![NPM](https://nodei.co/npm/mathoid.png)](https://nodei.co/npm/mathoid/)

Mathoid is a service that renders mathematical formuale on the server side.
It accepts
[Wikimedias LaTeX dialect texvc](https://en.wikipedia.org/wiki/Help:Displaying_a_formula),
[MathML](https://en.wikipedia.org/wiki/MathML) or
[AsciiMath](https://en.wikipedia.org/wiki/AsciiMath) as input and outputs 
MathML, 
fallback images with dimension meta-information and a textual representation of the input.

Under the hood Mathoid uses
[texvcjs](https://github.com/wikimedia/texvcjs),
[MathJax node](https://github.com/mathjax/MathJax-node),
[librsvg](https://github.com/2gis/node-rsvg), and the
[speech-rule-engine] 
 for the verification, rendering, conversion and the generation of the textual description.
Mathoid was forked from [svgtex](https://github.com/agrbin/svgtex).

An in-depth discussion of Mathoid can be in the following publications:

1. __Mathoid: Robust, Scalable, Fast and Accessible Math Rendering for Wikipedia__  
M Schubotz, G Wicke  
_Intelligent Computer Mathematics - International Conference, CICM 2014, Coimbra, Portugal, July 7-11, 2014. Proceedings_  
 [Preprint](https://arxiv.org/pdf/1404.6179.pdf) | [Bibtex](https://dblp.uni-trier.de/rec/bibtex/conf/mkm/SchubotzW14) | [DOI: 10.1007/978-3-319-08434-3_17](http://dx.doi.org/10.1007/978-3-319-08434-3_17)

2. __A Smooth Transition to Modern mathoid-based Math Rendering in Wikipedia with Automatic Visual Regression Testing__  
M Schubotz, AP Sexton  
_Joint Proceedings of the FM4M, MathUI, and ThEdu Workshops, Doctoral Program, and Work in Progress at the Conference on Intelligent Computer Mathematics 2016 co-located with the 9th Conference on Intelligent Computer Mathematics (CICM 2016), Bialystok, Poland, July 25-29, 2016._  
[Preprint](http://pure-oai.bham.ac.uk/ws/files/31196373/Schubotz_Sexton_Smooth_Transition_CEUR_Proceedings.pdf) | [Bibtex](https://dblp.org/rec/bib/conf/cikm/SchubotzS16) | [PDF]( http://ceur-ws.org/Vol-1785/W48.pdf)

## Installation
Mathoid currently supports [node](https://nodejs.org/) version 6,8 or 10. To check your node version run
`node --version` from the commandline. 

In addition the prerequisites from [librsvg](https://www.npmjs.com/package/librsvg#installation) are needed.
For Debian based systems installing the `librsvg2-dev` should be sufficient.
```bash
sudo apt-get install librsvg2-dev
```
Thereafter, clone and install Mathoid by running
```bash
git clone https://github.com/wikimedia/mathoid/
cd mathoid
npm install
```

### Run the tests
Before proceeding, we recommend running to run the tests via
```bash
npm test
```

The tests should pass in less than one minute.
If you plan to use Mathoid to render formulae for your small to medium scale wiki you are done.

### Service
For larger wikis using [RESTbase](https://www.mediawiki.org/wiki/RESTBase), running mathoid as a service is desired.
To install Mathoid as a unix service, you can use our [startup script](scripts/gen-init-scripts.rb).

A community maintained page with OS specific installation instructions is available from [MediaWiki](https://www.mediawiki.org/wiki/Manual:Mathoid).

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

## Run as service (with PM2)

[PM2](http://pm2.keymetrics.io/) is a process manager for Node.js. It supports starting applications
on system startup. You can set up mathoid to run automatically using this process manager.

For example, run
```bash
npm install pm2 -g
pm2 start pm2.config.js
pm2 save
pm2 startup
```
Thereafter check the generated output and run it as with root permissions.

## Create a new debian release

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

[1]: https://travis-ci.org/wikimedia/mathoid.svg
[2]: https://travis-ci.org/wikimedia/mathoid
[3]: https://david-dm.org/wikimedia/mathoid.svg
[4]: https://david-dm.org/wikimedia/mathoid
[5]: https://david-dm.org/wikimedia/mathoid/dev-status.svg
[6]: https://david-dm.org/wikimedia/mathoid#info=devDependencies
[7]: https://img.shields.io/coveralls/wikimedia/mathoid.svg
[8]: https://coveralls.io/r/wikimedia/mathoid
