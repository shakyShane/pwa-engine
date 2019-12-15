module.exports = function getQueries(_opts, ctx) {
    const cwd = ctx.config.cwd;
    const fs = require('fs');
    const { readFileSync } = fs;
    const { join } = require('path');

    const dir1 = join(cwd, 'src', 'queries');
    const first = fs.readdirSync(dir1).map(x => [dir1, x]);

    const output = first
        .filter(([, x]) => x.endsWith('.graphql'))
        .map(([dir, file]) => {
            return {
                name: file,
                query: readFileSync(join(dir, file), 'utf8'),
                endpoint: '/graphql',
            };
        });

    return output;
};
