const { join, resolve } = require('path');
const { readdirSync } = require('fs');

const gzipSize = require('gzip-size');
const prettyBytes = require('pretty-bytes');
const cTable = require('console.table');

function calculate(roots, CWD, basePath, stats) {
    return roots
        .filter(root => {
            if (!stats[root]) {
                console.warn(`missing: ${stats[root]}`);
                return false;
            }
            return true;
        })
        .map(root => {
            return {
                root,
                chunks: stats[root].assets
                    .filter(x => {
                        return !x.endsWith('.map');
                    })
                    .filter(x => {
                        return !x.endsWith('.css');
                    }),
            };
        })
        .map(item => {
            return {
                files: item.chunks.map(chunk => {
                    const raw = gzipSize.fileSync(join(CWD, basePath, chunk));
                    return { raw, pretty: prettyBytes(raw), chunk };
                }),
            };
        });
}

const excludeList = 'Checkout';

function breakdown(opts, ctx) {
    const CWD = ctx.config.cwd;
    const pkg = require(resolve(CWD, 'package.json'));
    const stats = require(resolve(CWD, `dist/stats.${pkg.version}.json`));
    const baseDir = 'dist';
    const others = readdirSync(resolve(CWD, 'src', 'RootComponents'))
        .filter(x => excludeList.indexOf(x) === -1)
        .map(r => `${r}_root`);
    const getTotalRaw = files => files.reduce((acc, item) => (acc += item.raw), 0);
    const client = calculate(['client'], CWD, baseDir, stats);
    const clientTotalRaw = getTotalRaw(client[0].files);

    const makePrintable = results =>
        results
            .slice()
            .sort((a, b) => b.total - a.total)
            .map(res => {
                const { name, chunkTotalPretty, totalPretty } = res;
                return {
                    Entry: name,
                    Runtime: prettyBytes(clientTotalRaw),
                    Chunk: chunkTotalPretty,
                    Total: totalPretty,
                };
            });

    const results = others.map(root => {
        const [total] = calculate([root], CWD, baseDir, stats);
        const itemSum = getTotalRaw(total.files);
        return {
            ...total,
            name: root.split('_')[0],
            chunkTotal: itemSum,
            chunkTotalPretty: prettyBytes(itemSum),
            total: itemSum + clientTotalRaw,
            totalPretty: prettyBytes(itemSum + clientTotalRaw),
        };
    });

    const over = results.filter(x => x.total > Number(opts.threshold));

    if (over.length > 0) {
        const error = 'Oops! you broke the budget on the following entry points';
        const table = cTable.getTable(makePrintable(over));
        throw new Error([error, '', table].join('\n'));
    } else {
        console.table(makePrintable(results));
    }
}

module.exports = breakdown;
