#!/usr/bin/env node

'use strict';

const program = require('commander');
const json = require('./package.json');
const fileOrStdin = require('file-or-stdin');
const fileOrStdout = require('file-or-stdout');
const render = require("./lib/render.js");

program
    .version(json.version)
    .usage('[options]')
    .option('-v, --verbose', 'Show verbose error information')
    .option('-c, --config [config]', 'YAML-formatted configuration file', './config.dev.yaml');
program.parse(process.argv);

const conf = render.start(program.config);

fileOrStdin(program.args[0], 'utf8').then((data) => {
    return render.render(data, conf).then((out) => {
        return fileOrStdout(program.args[1], JSON.stringify(out));
    }).then((isFile) => {
        // If no output file was given, wait until all data was written to stdout
        if (!isFile) {
            process.stdout.on('drain', () => {
                process.exit();
            });
        }
    });
});

