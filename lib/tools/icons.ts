/**
 * @param opts
 * @param _ctx
 * @param done
 */
module.exports = function(opts, _ctx, done) {
    const assert = require('assert');
    const fs = require('fs');
    const easysvg = require('easy-svg');
    const { parse } = require('path');

    const builder = easysvg.create();

    assert(typeof opts.outputHtml === 'string', 'opts.outputHtml should be a string');
    assert(typeof opts.outputTypes === 'string', 'opts.outputTypes should be a string');
    assert(Array.isArray(opts.icons), 'opts.icons should be an array of strings');
    assert(
        opts.icons.every(x => typeof x === 'string'),
        'opts.icons should be an array of strings',
    );

    opts.icons.forEach(function(path) {
        builder.add({
            key: path,
            content: fs.readFileSync(path, 'utf-8'),
        });
    });

    const union = opts.icons
        .map(x => parse(x))
        .map(obj => `"${obj.name}"`)
        .join(' | ');

    const type = `export type SvgIconNames = ${union}`;
    fs.writeFileSync(opts.outputTypes, type);

    builder
        .compile()
        .then(function(out) {
            const minify = require('html-minifier').minify;
            const result = minify(out, {
                collapseBooleanAttributes: true,
                collapseInlineTagWhitespace: true,
                collapseWhitespace: true,
            });
            fs.writeFileSync(opts.outputHtml, result);
            done();
        })
        .catch(function(err) {
            done(err);
        });
};
