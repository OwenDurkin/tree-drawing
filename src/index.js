import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

const SCREEN_WIDTH = 500;
const SCREEN_HEIGHT = 200;

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
    const methods = [thinPosCalc, knuthPosCalc,parentBasedPosCalc];
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
    }, 5],
    [{ // Dr. Dobbs
        0: [1,2,3],
        1: [4,5],
        5: [6,7],
        3: [8,9],
        9: [10,11,12,13,14],
    }, 15],
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
