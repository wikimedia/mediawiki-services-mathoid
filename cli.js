#!/usr/bin/env node

'use strict';

const program = require('commander');
const json = require('./package.json');
const render = require('./lib/render.js');
const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const stdin = process.stdin;
const stdout = process.stdout;

program
    .version(json.version)
    .usage('[options] [input-file] [output-file]')
    .option('-v, --verbose', 'Show verbose error information')
    .option('-c, --config [config]', 'YAML-formatted configuration file', './config.dev.yaml')
    .description('Transforms a list of rendering requests to a list of rendering responses.\n\n' +
        'If [input-file] or [output-file] is not specified standard input or ' +
        'standard output is used respectively.\n\n' +
        'The input and output formats correspond ' +
        'to the requests and result format of the express service.');
program.on('--help', () => {
    console.log('');
    console.log('Example usage:');
    console.log('');
    console.log('  $ ./cli.js < doc/sample-cli-input.json');
    console.log('  $ ./cli.js doc/sample-cli-input.json doc/sample-cli-output.json ');
});
program.parse(process.argv);

const conf = render.start(program.config);

const fileOrStdin = (path) => {
    // adapted from https://github.com/shinnn/file-or-stdin/blob/v1.0.2/index.js
    if (path) {
        return fs.readFileAsync(path, 'utf8');
    }
    let content = '';
    return new BBPromise((resolve) => {
        stdin.setEncoding('utf8');
        stdin.on('readable', () => {
            let chunk;

            while ((chunk = stdin.read()) !== null) {
                content += chunk;
            }
        });

        stdin.on('end', () => {
            resolve(content);
        });
    }
    );
};

const fileOrStdout = (path, content) => {
    if (path) {
        return fs.writeFileAsync(path, content, 'utf8');
    }
    return new BBPromise((resolve) => {
        stdout.write(content);
        resolve();
    });

};

fileOrStdin(program.args[0]).then((data) => {
    return render.render(data, conf).then((out) => {
        return fileOrStdout(program.args[1], JSON.stringify(out));
    }).then((isFile) => {
        // If no output file was given, wait until all data was written to stdout
        if (!isFile) {
            stdout.on('drain', () => {
                process.exit();
            });
        }
    });
});
