type HtmlProps = {
    content: string;
    state: any;
    css: string[];
    js: string[];
    legacyJs: string[];
    criticalCss: string;
    title: string;
    link: string;
    meta: string;
    beforeBodyEnd?: string;
    afterBodyStart: string;
    version: string;
    domain: string;
};

export function renderShell(props: HtmlProps) {
    return `
<html lang="en">
    <head>
        <meta name="robots" content="noindex">
        ${props.link}
        ${props.title}
        ${props.meta}
        <style>
            ${props.criticalCss}
        </style>
        ${props.css.map(x => `<link rel="stylesheet" href="/${x}" />`).join('')}
        ${props.js.map(x => `<link rel="preload" as="script" href="/${x}" />`).join('')}
    </head>
    <body>
        ${props.afterBodyStart}    
        <div id="root">${props.content}</div>
        <script type="text/json" id="apollo-client-state">${JSON.stringify(props.state).replace(
            /</g,
            '\\u003c',
        )}</script>
        <script type="text/json" id="app-env">${JSON.stringify({
            VERSION: props.version,
            DOMAIN: props.domain,
        })}</script>
        ${props.js.map(x => `<script type="module" src="/${x}"></script>`).join('')}
        ${props.legacyJs.map(x => `<script nomodule src="/${x}"></script>`).join('')}
        ${props.beforeBodyEnd}
    </body>
</html>
    `;
}
