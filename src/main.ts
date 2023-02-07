import './style.css'
import {compile as c} from "@mdx-js/mdx"
import recmaSection from './index';

const input = document.querySelector<HTMLTextAreaElement>('#input')
const output = document.querySelector<HTMLTextAreaElement>('#output')

function getComment(comment:string) {
  return comment ? comment.trim().startsWith("c:") ? comment.trim().slice(2) : undefined : undefined
}

function compile(input: string) {
  return c(input, {
    jsxImportSource: 'preact', 
    recmaPlugins: [[recmaSection, {getComment: getComment}]]
  })
}

function setOutput(input: HTMLTextAreaElement | null, output: HTMLTextAreaElement | null) {
  compile(input!.value)
    .then(o => output!.value = o.value)
    .catch(e => console.log(e))
}

input!.value = `
# blue

{/*c:comment*/}

export const c1 = ""

{/*c:comment2*/}

export const c2 = ""
`

setOutput(input, output)

function onInput(e:Event) {
  const output = document.querySelector<HTMLTextAreaElement>('#output')
  setOutput(e.target as HTMLTextAreaElement, output)
}

document.querySelector<HTMLTextAreaElement>('#input')!.oninput = onInput
