const { readFileSync, writeFileSync } = require('fs');

module.exports = function(_, ctx) {
    const { join, resolve } = require('path');
    const swPathDist = join(ctx.config.cwd, 'dist', 'sw.js');
    const version = require(resolve(ctx.config.cwd, 'package.json')).version;

    console.log('Reading: ', swPathDist);

    const content = readFileSync(swPathDist, 'utf8');

    console.log('replacing `__development__` with', version);

    const replaced = content.replace(`__development__`, version);

    writeFileSync(swPathDist, replaced);
};
