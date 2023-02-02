# recma-sections
A recma plugin to support sections in mdx

Utilize comments to split the exports from your .mdx files.

## Installation

```bash
yarn add @frontline-hq/recma-sections
```

or

```bash
npm install @frontline-hq/recma-sections
```

## Usage

Configure `@mdx/mdx-js` to use this plugin.

Also add a property `.getComment` with a function that accepts a comment as an input (parsed from the mdx file comments) and returns either...

- The desired sections name from the comment defining the section in the mdx file
- `undefined` for a comment that does not define a section

```js
import {compile} from '@mdx-js/mdx'

// return undefined for "illegal comments" or a string for the description to be used from the comment.
function getComment(comment) {
    return comment ? comment.trim().startsWith("c:") ? comment.trim().slice(2) : undefined : undefined
}

const result = await compile(file, {recmaPlugins: [[recmaSection, {getComment: getComment}]]})
```

That way, all the contents below a section will be added to an exported object named after the section containing these contents.

## Example

With the above configuration, this mdx file

```mdx
export const title = 'My document'
export const description = 'This is my document'

{/* c:one */}
Hello Next
Hello me

export const blue = "right"
export function m() {}

{/* c:two */}
Hello blue
```

Will be transformed to

```js
VFile {
  data: {},
  messages: [],
  history: [],
  cwd: '/Users/benjaminpreiss/Documents/work/recma-sections',
  value: '/*@jsxRuntime automatic @jsxImportSource react*/\n' +
    '/*c:one*/\n' +
    '/*c:two*/\n' +
    'const two = {};\n' +
    'const one = {};\n' +
    'import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";\n' +
    "export const title = 'My document';\n" +
    "export const description = 'This is my document';\n" +
    'function _createMdxContent(props) {\n' +
    '  const _components = Object.assign({\n' +
    '    p: "p"\n' +
    '  }, props.components);\n' +
    '  return _jsxs(_Fragment, {\n' +
    '    children: ["\\n", , "\\n", "\\n", "\\n", , ]\n' +
    '  });\n' +
    '}\n' +
    'function MDXContent(props = {}) {\n' +
    '  const {wrapper: MDXLayout} = props.components || ({});\n' +
    '  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {\n' +
    '    children: _jsx(_createMdxContent, props)\n' +
    '  })) : _createMdxContent(props);\n' +
    '}\n' +
    'export default MDXContent;\n' +
    '(function () {\n' +
    '  import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";\n' +
    '  {\n' +
    '    const blue = "right";\n' +
    '    one.blue = blue;\n' +
    '  }\n' +
    '  {\n' +
    '    function m() {}\n' +
    '    one.m = m;\n' +
    '  }\n' +
    '  function _createMdxContent(props) {\n' +
    '    const _components = Object.assign({\n' +
    '      p: "p"\n' +
    '    }, props.components);\n' +
    '    return _jsxs(_Fragment, {\n' +
    '      children: ["\\n", _jsx(_components.p, {\n' +
    '        children: "Hello Next\\nHello me"\n' +
    '      }), "\\n", "\\n", "\\n", , ]\n' +
    '    });\n' +
    '  }\n' +
    '  function MDXContent(props = {}) {\n' +
    '    const {wrapper: MDXLayout} = props.components || ({});\n' +
    '    return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {\n' +
    '      children: _jsx(_createMdxContent, props)\n' +
    '    })) : _createMdxContent(props);\n' +
    '  }\n' +
    '  one.default = MDXContent;\n' +
    '})();\n' +
    '(function () {\n' +
    '  import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";\n' +
    '  function _createMdxContent(props) {\n' +
    '    const _components = Object.assign({\n' +
    '      p: "p"\n' +
    '    }, props.components);\n' +
    '    return _jsxs(_Fragment, {\n' +
    '      children: ["\\n", , "\\n", "\\n", "\\n", _jsx(_components.p, {\n' +
    '        children: "Hello blue"\n' +
    '      })]\n' +
    '    });\n' +
    '  }\n' +
    '  function MDXContent(props = {}) {\n' +
    '    const {wrapper: MDXLayout} = props.components || ({});\n' +
    '    return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {\n' +
    '      children: _jsx(_createMdxContent, props)\n' +
    '    })) : _createMdxContent(props);\n' +
    '  }\n' +
    '  two.default = MDXContent;\n' +
    '})();\n' +
    'export {one, two};\n',
  map: undefined
}
```