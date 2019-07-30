const { existsSync } = require("fs");
const { resolve, basename, dirname, join } = require("path");

const DEFAULT_LOCALE = 'en';
const FILE_TYPE = 'yaml';

/**
 * Scan a folder and create webpack aliases based on a selected locale
 *
 * Eg: if a file like this is found:
 *
 *      global.en.i18n.yaml
 *
 * But the locale is set to `de` - then an alias will be created in the following format
 *
 *      {
 *          "global.en.i18n.yaml": "global.de.i18n.yaml"
 *      }
 *
 * @param selectedLocale
 * @param cwd
 */
export function localeAliases(selectedLocale: string, cwd: string): {[index: string]: string} {

    if (selectedLocale === DEFAULT_LOCALE) return {};

    const glob = require("glob");

    const files = glob.sync(`**/*.${DEFAULT_LOCALE}.i18n.${FILE_TYPE}`, {cwd});

    return files
        .map(f => {
            return {
                path: f,
                absolute: resolve(join(cwd, f))
            }
        })
        .map(({path, absolute}) => {
            const [name] = basename(absolute).split('.');
            const dir = dirname(absolute);
            const nextFile = join(dir, [name, selectedLocale, 'i18n', FILE_TYPE].join('.'));
            return {
                path,
                absolute,
                nextFile
            }
        })
        .filter(x => {
            return existsSync(x.nextFile)
        })
        .reduce((acc, item) => {
            acc[item.absolute] = item.nextFile;
            return acc;
        }, {});
}
