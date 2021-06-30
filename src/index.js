import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 300;

const RADIUS = 10;
const STROKE_WIDTH = 4;

// for separation of nodes
const SCALE = RADIUS+20;



// links
//
// python-based article
// http://llimllib.github.io/pymag-trees/
//
// Reingold-Tilford Algorithm in-depth
// https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
//
// Buchheim algorithm
// http://dirk.jivas.de/papers/buchheim02improving.pdf
//
// Brown University Paper
// https://cs.brown.edu/people/rtamassi/gdhandbook/chapters/trees.pdf


// GRAPH UTILITIES

// converts an edge map to a linked-node setup in memory
// each node is an object of the form {id: int, children:[id1,id2,...]},
//   where ids are node identifiers
// returns the root node
const edgeMapToRootNode = (edgeMap) => {
    const root = {
        id: 0,
        children: null,
    }; 
    const queue = [root];
    while (queue.length > 0) {
        const cur = queue.shift();
        const childrenIds = edgeMap[cur.id];
        if (childrenIds == null) {
            continue;
        }
        const children = childrenIds.map((id) => {
            const child = { id: id, children: null};
            return child;
        });
        cur["children"] = children;
        children.map(x => queue.push(x));
    }
    return root;
}
/*
// contours are the leftmost (rightmost) x coordinate of a node on a given level of a tree
const contour = (root, maxlevel, comparator) {
    let cont = [];
    const calcCont = (node, comparator, depth=0) => { 
        if (cont.length===0) {
            cont = [node.x];
        }
        else if (cont.length < level+1) {
            cont.push(node.x);
        }
        else if (comparator(cont[level], node.x)) {
            cont[level] = node.x
        }
        for (const child of node.children) {
            calcCont(child, comparator, level+1, cont);
        }
    }
    calcCont(root,comparator,0);
    return cont
}
*/


// for determining how far a subtree needs to be moved to the right
/*
const push_right = (leftNode, rightNode) => {
    leftContour = contour(leftNode, (x,y) => (x < y)); 
    rightContour = contour(rightNode, (x,y) => (x > y));
    let max = 0;
    leftContour.forEach((lx,i) => {
        ly = rightContour[i];
        max = Math.max(lx-ly,max);
    })
    return max + 1;
}
*/

// for use with thread-involved algos;
// 
// threads in this context have nothing to do with multithreading


// TREE DRAWING METHODS

// the Wetherell/Shannon algo works according to the python article
const thinPosCalc = (edgeMap, nodeCount) => {
    const nexts = Array(nodeCount).fill(0);
    const positions = Array(nodeCount);
    const applyMethod = (node,depth=0) => {
        positions[node.id] = [SCALE*(nexts[depth]+1),SCALE*(depth+1)]
        nexts[depth] += 1;
        if(node.children===null) {
            return;
        }
        for(const child of node.children) {
            applyMethod(child,depth+1);
        }
    }
    const root = edgeMapToRootNode(edgeMap);
    applyMethod(root);
    return positions;
}


// only works on binary trees, uses in-order traversal
const knuthPosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount).fill([0,0]);
    const root = edgeMapToRootNode(edgeMap);
    let i = 0;
    const applyMethod = (node, depth) => {
        const left = node.children ? node.children[0] : null;
        const right = node.children ? node.children[1] : null;
        if (left) {
            applyMethod(left, depth+1);
        }
        positions[node.id] = [SCALE*(i+1),SCALE*(depth+1)]
        i += 1;
        if(right) {
            applyMethod(right,depth+1);
        }
    }
    applyMethod(root,0);
    return positions;
}


// picks node positions so that parent nodes are centered above their children
// more or less copied from the article and converted from python2.7 to JS
const parentBasedPosCalc = (edgeMap,nodeCount) => {
    const root = edgeMapToRootNode(edgeMap);
    const positions = Array(nodeCount).fill([0,0]);
    // indices for nexts and offset are depth
    const setup = (node, depth=0, nexts, offset) => {
        // post-order ~ bottom-up
        if (node.children) {
            for (const child of node.children) {
                setup(child,depth+1,nexts,offset);
            }
        }
        node.depth = depth;
        let place; 
        if(node.children === null) {
            place = nexts[depth];
            node.x = place;
        }
        else if (node.children.length === 1) {
            place =  node.children[0].x - 1
        }
        else {
            const adder = (acc,cur) => (acc+cur.x);
            place = node.children.reduce(adder,0) / node.children.length;
        }
        offset[depth] = Math.max(offset[depth], nexts[depth]-place);
        if(node.children) {
            node.x = place + offset[depth];
        }
        nexts[depth] += 2;
        node.mod = offset[depth];
    }
    const addmods = (node,modsum=0) => {
        node.x = node.x + modsum;
        positions[node.id] = [SCALE*(node.x+1), SCALE*(node.depth+1)];
        if(node.children === null) {
            return;
        }
        for(const child of node.children) {
            addmods(child, modsum);
        }
    }

    setup(root,0,Array(nodeCount).fill(0),Array(nodeCount).fill(0));
    addmods(root,0);
    return positions;
}


const NODE_SEP = 1;
const quadraticPosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount);
    const root = edgeMapToRootNode(edgeMap);
    const moveRight = (node, mod) =>  {
        node.x += mod;
        if(node.children) {
            for(const child of node.children) {
                moveRight(child, mod);
            }
        }
    }
    const getSidemost = (node,comp) => {
        if (node.children) {
            return node.children.reduce(
                (acc,nextChild) => {
                    acc = comp(acc,getSidemost(nextChild,comp));
                    return acc;
                },
                node.x
            );
        }
        return node.x;
    }
    const width = (node) => (getSidemost(node,Math.max)-getSidemost(node,Math.min));
    const calcPos = (node) => {
        if(node.children) {
            node.children.forEach((child,i) => {
                child.x = 0;
                calcPos(child);
                if(i > 0) {
                    const prev = node.children[i-1];
                    const offset = getSidemost(prev,Math.max)+NODE_SEP;
                    moveRight(child,offset);
                }
                node.x = (node.children[0].x + node.children[node.children.length-1].x)/2;
            });
        }
    }
    const applyPos = (node,depth=0) => {
        positions[node.id] = [SCALE*(node.x+1),SCALE*(depth+1)];
        if(node.children) {
            for(const child of node.children) {
                applyPos(child,depth+1);
            }
        }
    }
    calcPos(root);
    applyPos(root);
    return positions;
}


/*
const reingoldTilfordPosCalc = (edgeMap,nodeCount) => {
    const positions = Array(nodeCount);
    const root = edgeMapToRootNode(edgeMap);
    // assign 0 to leftmost nodes, shift by 1 if it has a left sibling
    // center children over parents
    const initialSetup = (node) => {
        if(node.children) {
            // arbitrary starting x; handles base case
            node.children.forEach((child,i) => {
                child.x = NODE_SEP*i;
            });
            // determine the subtrees; shift as necessary
            let mod = 0;
            let [leftmost, rightmost] = [0,0];
            node.children.forEach((child,i) => {
                const [subleftmost, subrightmost] = initialSetup(child);
                if (mod+rightmost <= child.x-subleftmost) {
                    mod += SUBTREE_SEP + (child.x-(mod+rightmost));
                    child.mod = mod;
                }
                rightmost = child.x+mod+subrightmost;
            });
            // center the parent over the children 
            node.x = (rightmost-leftmost)/2
            // return the left and right countours
            return [leftmost,rightmost];
        } else {
            return [node.x,node.x];
        }
    }
    // apply shifts in O(n) time throughout the tree
    const modify = (node, depth=0, mod=0) => {
        positions[node.id] = [SCALE*(node.x+mod+1),SCALE*(depth+1)];
        if(node.children) {
            node.children.forEach((child,i) => {
                modify(child,depth+1,mod+node.mod);
            });
        }
    }
    // execute the algorithm
    root.x = 0;
    initialSetup(root);
    modify(root);
    return positions;
}
*/

// ACTUAL REACT COMPONENTS

// props: x,y
const Node = (props) => (
    <circle
        cx={props.x}
        cy={props.y}
        r={RADIUS}
        style={{fill:"black",stroke:"black"}}
    />
);

// props:
// => tree (i.e. an edge map, with 0 as root)
// => nodeCount, the number of nodes
const TreeDrawing = (props) => {
    // transforms a tree into a list of x,y coordinates, one for each node
    const calculatePositions = props.calcMethod;

    const nodePositions = calculatePositions(props.edgeMap, props.nodeCount);
    const nodes = []
    const edges = [];
    for (let i = 0; i < props.nodeCount; i++) {
        const [x,y] = nodePositions[i];
        nodes.push(
            (<Node key={i} x={x} y={y} />)
        );
        const curEdges = props.edgeMap[i];
        if (curEdges === undefined) {
            continue;
        }
        for(let j = 0; j < curEdges.length; j++) {
            const c = curEdges[j];
            edges.push((<line
                key={[i,j]}
                x1={nodePositions[i][0]}
                y1={nodePositions[i][1]}
                x2={nodePositions[c][0]}
                y2={nodePositions[c][1]}
                stroke="black"
                strokeWidth={STROKE_WIDTH}
            />));
        }
    }
    return (
        <svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            {nodes}
            {edges}
        </svg>
    );
}


const Forest = (props) => {
    const methods = [thinPosCalc, knuthPosCalc,parentBasedPosCalc,quadraticPosCalc];
    const drawings = methods.map((method,i) => (
        <div className="Column" key={i}>
            <h1>{method.name}</h1>
            <TreeDrawing
                calcMethod={method}
                edgeMap={props.edgeMap}
                nodeCount={props.nodeCount}
            />
        </div>
        )
    );
    return (
        <div className="Row">
            {drawings}
        </div>
    );
}


const TREES = [
    [{ // full binary tree of size 3
        0: [1,2],
    }, 3],
    [{ // simple tree
        0: [1,2],
        1: [3,],
        2: [4,5],
        3: [6,7],
    }, 8],
    [{ // full tree
        0: [1,2],
        1: [3,4],
        2: [5,6],
        3: [7,8],
        4: [9,10],
        5: [11,12],
        6: [13,14],
    }, 15],
    [{ // linked list
        0: [1],
        1: [2],
        2: [3],
        3: [4],
        4: [5],
    }, 6],
    [{ // sparse
        0: [1,2],
        2: [3],
        3: [4],
        4: [5],
        5: [6],
        6: [7],
        7: [8],
        8: [9]
    }, 10],
    [{ // Dr. Dobbs
        0: [1,2,3],
        1: [4,5],
        5: [6,7],
        3: [8,9],
        9: [10,11,12,13,14],
    }, 15],
    [{ // wide boi
        0: [1,2],
        1: [3],
        3: [4,5,6,7,8],
        2: [9,10,11,12],
        12: [13,14,15,16,17],
    },18],
];

const alltreedrawings = TREES.map((tree,i) => (
    <Forest key={i} nodeCount={tree[1]} edgeMap={tree[0]} />)
);

ReactDOM.render(
  <React.StrictMode>
    {alltreedrawings}
  </React.StrictMode>,
  document.getElementById('root')
);
