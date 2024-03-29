import { replace } from 'estraverse'
import esquery from "esquery"
import { Declaration, Expression, Node, Program, Comment, ModuleDeclaration, Statement, Directive, Identifier, ExpressionStatement} from 'estree'

function removeUnassociated(ast: Node, start: number, end: number) {
    replace(ast, {
        enter: function(node: any) {
            if(Number.isInteger(node.end) && node.end < start || Number.isInteger(node.start) && node.start > end) {
                // remove the rest of this path from ast.
                this.remove()
            }
        }
    })
}

function getMemberAssignment(sI: string, p: string, insertion: Expression | Identifier | Declaration): ExpressionStatement {
    // Can only be declaration or expression
    return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": {
                "type": "MemberExpression",
                "object": {
                    "type": "Identifier",
                    "name": sI
                },
                "property": {
                    "type": "Identifier",
                    "name": p
                },
                "computed": false,
                "optional": false
            },
            "right": insertion as Expression
        }
    }
}

type ExtendedComment = Comment & {start: number, end: number}

export default function recmaSection ({getComment}: {getComment: (comment: string | undefined) => string | undefined}) {
    return function (ast: Program & {start: number, end: number}) {
        const newAst: Program = structuredClone(ast)
        newAst.body = []
        // Create sections, each with it's own ast copy.
        const sectionComments = (ast.comments as Array<ExtendedComment>)?.filter(v => getComment(v.value)) ?? []
        if(sectionComments.length === 0) return ast
        const sections = sectionComments
            .map((c,i,array) => {
                return {
                    ast: structuredClone(ast) as Program, 
                    comment: getComment(c.value) as string, 
                    start: c.start, 
                    end: array.length > i+1 ? array[i+1].start : ast.end
                }
            })
        sections.splice(0,0,{
            ast: structuredClone(ast) as Program,
            comment: getComment(undefined) as string,
            start: 0,
            end: sections[0].start
        })
        // Remove unassociated nodes from each sections ast copy
        sections.forEach(v => removeUnassociated(v.ast, v.start, v.end))
        // For all sections, except the 1st:
        // 0. Save identifiers / names of exports in array.
        // 1. Remove exports of identifiers completely (including child nodes), and export-node only for exports of named declarations
        // 2. Make all exports from a section become (unexported) properties of that object

        // Add exports object to beginning of ast:
        // Added length: 11 + l -> ADD TO ALL NUMBERS higher than 11 + l

        sections.filter(v=>v.comment).forEach(v => {
            const sI = v.comment;
            //add to "end" if end >= at, add to "start" if start > at
            (newAst.body as Statement[]).splice(0,0,{
                    "type": "VariableDeclaration",
                    "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": sI
                        },
                        "init": {
                            "type": "ObjectExpression",
                            "properties": []
                        }
                    }
                    ],
                    "kind": "const"
                })
            // Go through all exports and transform them to object properties.
            const toAssign: ExpressionStatement[] = []
            replace(v.ast as Program, {
                enter: function (node) {
                    const bodyCursor = v.ast.body.indexOf(node as ModuleDeclaration | Statement | Directive)
                    switch (node.type) {
                        case "ExportDefaultDeclaration":
                            /*  this is a default export

                                e.g.:
                                1. export default function () {};
                                2. export default function blue () {};
                                3. export default class {};
                                4. export default class Blue {};
                                5. export default x=5;

                                -> Replace with object member assignment
                            */
                            const insertion = structuredClone(node.declaration)
                            const p = "default"
                            const member = getMemberAssignment(sI, p, insertion)
                            return member
                        case "ExportNamedDeclaration":
                            if(node.declaration) {
                                /*  this is a named export declaration

                                    e.g.:
                                    1. export var foo = 1;
                                    ... And the same as default exports ...

                                    -> keep named declaration, Replace with object member assignment
                                */
                                const insertion = structuredClone(node.declaration)
                                const pId = esquery(node.declaration, '*.id')[0] as Identifier
                                const identifier = {
                                    "type": "Identifier",
                                    "name": pId.name
                                } as Identifier
                                const member = getMemberAssignment(sI, pId.name, identifier)
                                toAssign.push(member)
                                return insertion
                            } else if(node.specifiers) {
                                /*  this is a specifier export

                                    e.g.:
                                    1. export {bar as foo, rad}

                                    -> Replace ALL specifiers (can be multiple) with object member assignment
                                */
                                // Iterate through specifiers
                                const iterators = node.specifiers.map(v => {
                                    return {
                                        localIdentifier: esquery(v, '*.local')[0] as Identifier,
                                        exportedName: (esquery(v, '*.exported')[0] as Identifier).name,
                                        specifier: v
                                    }
                                })
                                // insert piece of code for all iterators
                                iterators.forEach((iterator) => {
                                    const insertion = structuredClone(iterator.localIdentifier)
                                    const p = iterator.exportedName
                                    const memberAssignment = getMemberAssignment(sI, p, insertion)
                                    v.ast.body.splice(bodyCursor, 0, memberAssignment)
                                })
                                // completely remove node
                                this.remove()
                                return
                            } else {
                                // this would be an export with source
                                // e.g. export export {foo} from "mod";
                                // These are not section-specific and therefore can just stay exports.
                                return
                            }
                        case "ExportAllDeclaration":
                            // this would be an export for all properties of source
                            // e.g. export * from "mod";
                            // These are not section-specific and therefore can just stay exports.
                            return
                        case "ImportDeclaration":
                            this.remove()
                            return
                        default:
                            return
                    }
                }
            })
            v.ast.body.push(...toAssign)
            // remove null references in body 
            const iief: ExpressionStatement = {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "FunctionExpression",
                        "id": null,
                        "generator": false,
                        "async": false,
                        "params": [],
                        "body": {
                            "type": "BlockStatement",
                            "body": v.ast.body as Statement[]
                        }
                    },
                    "arguments": [],
                    "optional": false
                }
            }
            v.ast.body = [iief]
        })

        // wrap with IIEF

        sections.forEach(s => {
            newAst.body.push(...s.ast.body)
        })

        newAst.body.push({
            "type": "ExportNamedDeclaration",
            "declaration": null,
            "specifiers": sections.filter(s=>s.comment).map(s => {
                return {
                    "type": "ExportSpecifier",
                    "local": {
                        "type": "Identifier",
                        "name": s.comment
                    },
                    "exported": {
                        "type": "Identifier",
                        "name": s.comment
                    }
                }
            }),
            "source": null
        })

        newAst.body = newAst.body.filter(v => v != null)

        return newAst
    }
}