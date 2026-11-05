import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const layers = ['domain', 'application', 'adapters', 'ui'];
const allowed = { domain: ['domain'], application: ['domain', 'application'], adapters: ['domain', 'application', 'adapters'], ui: ['domain', 'application', 'ui'] };
const storageNames = new Set(['localStorage', 'sessionStorage', 'indexedDB']);

function layerOf(file, root) {
  const relative = path.relative(path.join(root, 'src'), file).split(path.sep);
  return layers.includes(relative[0]) ? relative[0] : null;
}

export function analyzeSource(filename, content, root = process.cwd()) {
  const file = path.resolve(root, filename);
  const layer = layerOf(file, root);
  if (!layer) return [];
  const errors = [];
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, message) => errors.push({ file: path.relative(root, file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, message });
  function checkImport(node, value) {
    if (!value || !ts.isStringLiteral(value)) { report(node, 'Use a static import path so dependency boundaries can be checked.'); return; }
    const name = value.text;
    if (name.startsWith('.')) {
      const target = layerOf(path.resolve(path.dirname(file), name), root);
      if (!target || !allowed[layer].includes(target)) report(node, `${layer} cannot import ${target ?? 'a composition root or external file'}.`);
    } else if (layer === 'domain' || layer === 'application') {
      report(node, `${layer} cannot depend on UI, browser, Node, database, or provider packages.`);
    } else if (layer === 'ui' && (name.startsWith('node:') || name.startsWith('@/adapters') || name.startsWith('@/server'))) {
      report(node, 'UI must call application operations, not infrastructure.');
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) checkImport(node, node.moduleSpecifier);
    if (ts.isImportTypeNode(node)) checkImport(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : null);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) checkImport(node, node.arguments[0]);
    if (ts.isIdentifier(node) && storageNames.has(node.text) && layer !== 'adapters') report(node, 'Browser storage belongs behind an adapter.');
    if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && storageNames.has(node.argumentExpression.text) && layer !== 'adapters') report(node, 'Browser storage belongs behind an adapter.');
    if (layer === 'domain' && ts.isIdentifier(node) && ['window', 'document', 'process', 'fetch', 'Date'].includes(node.text)) report(node, 'Inject runtime inputs; domain code cannot use host/browser APIs.');
    if (layer === 'domain' && ts.isPropertyAccessExpression(node) && node.expression.getText(source) === 'Math' && node.name.text === 'random') report(node, 'Inject nondeterministic inputs.');
    ts.forEachChild(node, visit);
  }
  visit(source);
  return errors;
}

function inspectDirectory(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return inspectDirectory(full);
    return /\.[cm]?tsx?$/.test(entry.name) ? analyzeSource(full, readFileSync(full, 'utf8')) : [];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = inspectDirectory(path.resolve('src'));
  for (const error of errors) console.error(`${error.file}:${error.line} ${error.message}`);
  if (errors.length) process.exitCode = 1;
  else console.log('Module boundaries passed: pure domain, application operations, UI, and adapters.');
}
