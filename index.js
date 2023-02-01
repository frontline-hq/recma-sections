import { traverse, replace } from 'estraverse'

function removeUnassociated(ast, start, end) {
    replace(ast, {
        enter: function(node) {
            if(Number.isInteger(node.end) && node.end < start || Number.isInteger(node.start) && node.start > end) {
                // remove the rest of this path from ast.
                return null
            }
        }
    })
}

function getMemberAssignment(sI, p, insertion) {
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
            "right": insertion
        }
    }
}

function findKey(obj, value) {
    return Object.keys(obj).find(k=>obj[k]===value)
}

function getNextIdentifier(ast, keyInParent, parent) {
    let identifier
    traverse(ast, {
        enter: function (node, p) {
            const key = findKey(p ?? parent, node)
            if (node.type === "Identifier" && node.name && keyInParent === key) {
                identifier = node
                this.break()
            }
        }
    })
    return identifier
}

export default function recmaSection ({getComment}) {
    return function (ast) {
        const newAst = structuredClone(ast)
        newAst.body = []
        // Create sections, each with it's own ast copy.
        const sections = [{
            ast: structuredClone(ast),
            comment: undefined,
            start: 0,
            end: undefined
        }]
            .concat(ast.comments.filter(v => getComment(v.value)))
            .map((c,i,array) => {
                return {
                    ast: structuredClone(ast), 
                    comment: getComment(c.value), 
                    start: c.start, 
                    end: array.length > i+1 ? array[i+1].start : ast.end
                }
            })
        // Remove unassociated nodes from each sections ast copy
        sections.forEach(v => removeUnassociated(v.ast, v.start, v.end))
        // For all sections, except the 1st:
        // 0. Save identifiers / names of exports in array.
        // 1. Remove exports of identifiers completely (including child nodes), and export-node only for exports of named declarations
        // 2. Make all exports from a section become (unexported) properties of that object

        // Add exports object to beginning of ast:
        // Added length: 11 + l -> ADD TO ALL NUMBERS higher than 11 + l

        sections.filter(v=>v.comment).forEach((v, i) => {
            const sI = v.comment
            const l1 = sI.length
            //add to "end" if end >= at, add to "start" if start > at
            newAst.body.splice(0,0,{
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
            replace(v.ast, {
                enter: (node, parent) => {
                    const bodyCursor = v.ast.body.indexOf(node)
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
                                const p = getNextIdentifier(node.declaration, "id", node).name
                                const identifier = {
                                    "type": "Identifier",
                                    "name": p
                                }
                                const member = getMemberAssignment(sI, p, identifier)
                                return {
                                    "type": "BlockStatement",
                                    "body": [
                                        insertion,
                                        member
                                    ]
                                }
                            } else if(node.specifiers) {
                                /*  this is a specifier export

                                    e.g.:
                                    1. export {bar as foo, rad}

                                    -> Replace ALL specifiers (can be multiple) with object member assignment
                                */
                                // Iterate through specifiers
                                const iterators = node.specifiers.map(v => {
                                    return {
                                        localIdentifier: getNextIdentifier(v, "local", node),
                                        exportedName: getNextIdentifier(v, "exported", node).name,
                                        specifier: v
                                    }
                                })
                                // insert piece of code for all iterators
                                const lastIterator = iterators.pop()
                                iterators.forEach((iterator) => {
                                    const insertion = structuredClone(iterator.localIdentifier)
                                    const p = iterator.exportedName
                                    if(index = 0) {
                                        const memberAssignment = getMemberAssignment(sI, p, insertion)
                                        v.ast.body.splice(bodyCursor, 0, memberAssignment)
                                    } else {
                                        const memberAssignment = getMemberAssignment(sI, p, insertion)
                                        v.ast.body.splice(bodyCursor, 0, memberAssignment)
                                    }
                                })
                                // completely remove node
                                return null
                            } else {
                                // this would be an export with source
                                // e.g. export export {foo} from "mod";
                                // These are not section-specific and therefore can just stay exports.
                                return undefined
                            }
                        case "ExportAllDeclaration":
                            // this would be an export for all properties of source
                            // e.g. export * from "mod";
                            // These are not section-specific and therefore can just stay exports.
                            return undefined
                        default:
                            return undefined
                    }
                }
            })
            // remove null references in body 
            const iief = {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "FunctionExpression",
                        "id": null,
                        "expression": false,
                        "generator": false,
                        "async": false,
                        "params": [],
                        "body": {
                            "type": "BlockStatement",
                            "body": v.ast.body.filter(v => v != null)
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