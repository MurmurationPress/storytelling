'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const FORMATS = Object.freeze({ '.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WebP' });
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
function baseFor(vscode, document) {
  if (document.uri.scheme !== 'file') return null;
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return { directory: path.dirname(document.uri.fsPath), root: folder?.uri.fsPath || path.dirname(document.uri.fsPath) };
}
function decodeSourcePath(src) {
  if (!src || /^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith('//')) throw Error('Use a relative local image path; remote and embedded URLs are disabled');
  let decoded;
  try { decoded = decodeURIComponent(src); } catch { throw Error('Invalid percent escape in image path'); }
  if (path.isAbsolute(decoded) || decoded.includes('\0')) throw Error('Use a relative local image path');
  return decoded;
}
async function inspectImage(vscode, document, src) {
  const base = baseFor(vscode, document);
  if (!base) throw Error('Save this Markdown document before resolving relative images');
  const decoded = decodeSourcePath(src);
  const format = FORMATS[path.extname(decoded).toLowerCase()];
  if (!format) throw Error('Unsupported image format; use local PNG, JPEG or WebP');
  const target = path.resolve(base.directory, decoded);
  if (!inside(base.root, target)) throw Error('Image is outside the containing workspace or source directory');
  // Canonical paths also protect against a symlink inside a workspace escaping its root.
  let canonical;
  try { canonical = await fs.realpath(target); } catch { throw Error('Image is missing or unreadable'); }
  if (!inside(await fs.realpath(base.root), canonical)) throw Error('Image resolves outside the permitted resource root');
  const uri = vscode.Uri.file(target);
  let bytes;
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (!(stat.type & vscode.FileType.File)) throw Error('not a file');
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch { throw Error('Image is missing or unreadable'); }
  const valid = format === 'PNG' ? bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : format === 'JPEG' ? bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP';
  if (!valid) throw Error(`Unreadable ${format} image data`);
  return uri;
}
async function resolveMedia(vscode, document, webview, scene) {
  const entries = await Promise.all(scene.images.map(async src => {
    try { return [src, { url: webview.asWebviewUri(await inspectImage(vscode, document, src)).toString() }]; }
    catch (error) { return [src, { error: error.message }]; }
  }));
  const media = Object.fromEntries(entries);
  const diagnostics = entries.filter(([, value]) => value.error).map(([src, value]) => `Line ${scene.imageLines?.[src] || '?'}: Image ${src || '(empty path)'}: ${value.error}`);
  return { media, diagnostics };
}
module.exports = { FORMATS, baseFor, decodeSourcePath, inspectImage, resolveMedia, inside };
