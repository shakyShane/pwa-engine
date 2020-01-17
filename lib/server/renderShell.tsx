import { readFileSync } from 'fs';
import { join } from 'path';

type HtmlProps = {
    content?: string;
    state?: any;
    css?: string[];
    js?: string[];
    legacyJs?: string[];
    criticalCss?: string;
    title?: string;
    link?: string;
    meta?: string;
    beforeBodyEnd?: string;
    afterBodyStart?: string;
    version?: string;
    domain?: string;
};

const loadcss = readFileSync(join(__dirname, 'templates', 'loadcss.html'), 'utf8');
const modernizr = readFileSync(join(__dirname, 'templates', 'modernizr.html'), 'utf8');

export function renderShell(props: HtmlProps) {
    const {
        content = '<!-- content missing -->',
        state = {},
        css = [],
        js = [],
        legacyJs = [],
        criticalCss = '<!-- critical css missing -->',
        title = '<!-- title missing -->',
        link = '<!-- link elements missing -->',
        meta = '<!-- meta element missing -->',
        beforeBodyEnd = '',
        afterBodyStart = '',
        version = '__development__',
        domain = 'example.com',
    } = props;
    return `
<html lang="en">
    <head>
        <meta name="robots" content="noindex">
        ${link}
        ${title}
        ${meta}
        <style>
            ${criticalCss}
        </style>
        ${css
            .map(
                x =>
                    `<link rel="preload" href="/${x}" as="style" crossorigin onload="this.onload=null;this.rel='stylesheet'">`,
            )
            .join('')}
        <noscript>
        ${css.map(x => `<link href="/${x}" rel="stylesheet" />`).join('')}
        </noscript>
        ${loadcss}
        ${js.map(x => `<link rel="preload" as="script" crossorigin href="/${x}" />`).join('')}
        ${modernizr}
    </head>
    <body>
        ${afterBodyStart}    
        <div id="root">${content}</div>
        <script type="text/json" id="apollo-client-state">${JSON.stringify(state).replace(/</g, '\\u003c')}</script>
        <script type="text/json" id="app-env">${JSON.stringify({
            VERSION: version,
            DOMAIN: domain,
        })}</script>
        <script type="module">window.__moduleSupport = true;</script>
        ${js.map(x => `<script type="module" src="/${x}"></script>`).join('')}
        ${legacyJs.map(x => `<script nomodule async defer src="/${x}"></script>`).join('')}
        ${beforeBodyEnd}
    </body>
</html>
    `;
}
