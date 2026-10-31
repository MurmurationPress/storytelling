'use strict';
const esbuild = require('esbuild');
const fs = require('node:fs/promises');
const path = require('node:path');
const styles = path.resolve(__dirname, '../src/mermaid-styles.cjs');
function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw Error('Pinned Mermaid style integration changed; inspect measurement path before updating');
  return source.replace(from, to);
}
const diagramStyles = {
  name: 'trusted-mermaid-styles',
  setup(build) {
    let core = false, selection = false;
    build.onEnd(result => { if (!result.errors.length && (!core || !selection)) throw Error('Pinned Mermaid style hooks were not both applied'); });
    build.onLoad({ filter: /[/\\]mermaid[/\\]dist[/\\]mermaid\.core\.mjs$/ }, async args => {
      core = true;
      const source = await fs.readFile(args.path, 'utf8');
      let contents = `import { authorizeDiagramStyle, extractGeneratedInlineStyles } from ${JSON.stringify(styles)};\n` + replaceOnce(source,
        'style1.innerHTML = rules;\n  svg.insertBefore(style1, firstChild);',
        'style1.textContent = rules;\n  authorizeDiagramStyle(style1, id38);\n  svg.insertBefore(style1, firstChild);');
      contents = replaceOnce(contents, 'let code2 = root.select(enclosingDivID_selector).node().innerHTML;', 'extractGeneratedInlineStyles(svgNode.node());\n    let code2 = root.select(enclosingDivID_selector).node().innerHTML;');
      return { contents, loader: 'js', resolveDir: path.dirname(args.path) };
    });
    build.onLoad({ filter: /[/\\]d3-selection[/\\]src[/\\]selection[/\\]attr\.js$/ }, async args => {
      selection = true;
      let source = await fs.readFile(args.path, 'utf8');
      source = replaceOnce(source, 'this.setAttribute(name, value);', 'setGeneratedAttribute(this, name, value);');
      source = replaceOnce(source, 'this.setAttribute(name, v);', 'setGeneratedAttribute(this, name, v);');
      return { contents: `import { setGeneratedAttribute } from ${JSON.stringify(styles)};\n` + source, loader: 'js', resolveDir: path.dirname(args.path) };
    });
  }
};
(async () => {
  for (const [source, output] of [['webview.cjs','player.js'],['web-entry.cjs','web-reader.js']])
    await esbuild.build({ entryPoints: [`src/${source}`], bundle: true, platform: 'browser', outfile: `dist/${output}`, plugins: [diagramStyles], logLevel: 'info' });
  require('./bundle-licences.cjs');
})().catch(error => { console.error(error); process.exitCode = 1; });
