import path from 'path'

const root = process.cwd()
const src = path.resolve(root, 'src')

export const shopifyFolders = [
  'assets',
  'config',
  'layout',
  'locales',
  'templates',
  'snippets',
  'sections',
]

export const paths = {
  root,
  src: src,
  dist: path.resolve(root, 'dist'),
  assets: path.resolve(src, 'assets'),
  css: path.resolve(src, 'css'),
  cssComponents: path.resolve(src, 'css', 'components'),
  js: path.resolve(src, 'js'),
  jsBlocks: path.resolve(src, 'js', 'blocks'),
  jsComponents: path.resolve(src, 'js', 'components'),
  layout: path.resolve(src, 'layout'),
  locales: path.resolve(src, 'locales'),
  schemas: path.resolve(src, 'schemas'),
  sections: path.resolve(src, 'sections'),
  config: path.resolve(src, 'config'),
  snippets: path.resolve(src, 'snippets'),
  templates: path.resolve(src, 'templates'),
}
