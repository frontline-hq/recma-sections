import {compile} from '@mdx-js/mdx'
import recmaSection from './index.js'

const file = `
export const title = 'My document'
export const description = 'This is my document'

{/* c:one */}
Hello Next
Hello me

export const blue = "right"
export function m() {}

{/* c:two */}
Hello blue
`

// return undefined for "illegal comments" or a string for the description to be used from the comment.
function getComment(comment) {
    return comment ? comment.trim().startsWith("c:") ? comment.trim().slice(2) : undefined : undefined
}

const result = await compile(file, {recmaPlugins: [[recmaSection, {getComment: getComment}]]})

console.log(result)