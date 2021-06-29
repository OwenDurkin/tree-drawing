import React from 'react';
import ReactDOM from 'react-dom';

const SCREEN_WIDTH = 1618;
const SCREEN_HEIGHT = 1000;

const RADIUS = 10;
const STROKE_WIDTH = 4;

// for separation of nodes
const SCALE = RADIUS+20;



// FUNCTIONS FOR TREE DRAWING


// converts an edge-map to a linked-node setup in memory. Assumes the tree is binary.
// Returns the root node.
const edgeMapToRootNodeOfBinaryTree = (edgeMap) => {
    const root = {
        id: 0,
        left: null,
        right: null,
    }; 
    const queue = [root];
    while (queue.length > 0) {
        const cur = queue.shift();
        const children = edgeMap[cur.id];
        if (children) {
            cur["left"] = { id: children[0], left: null, right: null, }
            queue.push(cur.left);
            cur["right"] = { id: children[1], left: null, right: null, }
            queue.push(cur.right);
        }
    }
    return root;
}

// crappy thing I came up with based on skimming that one article
// http://llimllib.github.io/pymag-trees/
const bfsPosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount);
    const queue = [[0,0]];
    let trackedLevel = 0;
    let [x,y] = [SCALE,SCALE]
    while(queue.length > 0) {
        const [curNode, curLevel] = queue.shift();
        if(curLevel > trackedLevel) {
            trackedLevel = curLevel;
            x = SCALE;
            y += SCALE;
        }
        positions[curNode] = [x,y];
        x += SCALE;
        const children = edgeMap[curNode];
        if (children === undefined) {
            continue;
        }
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            queue.push([child,curLevel+1]);
        }
    }
    return positions;
}


// only works on binary trees, uses in-order traversal
const knuthPosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount);
    const root = edgeMapToRootNodeOfBinaryTree(edgeMap);

    let i = 0;
    const applyMethod = (node, depth) => {
        if (node.left) {
            applyMethod(node.left, depth+1);
        }
        positions[node.id] = [SCALE*(i+1),SCALE*(depth+1)]
        i += 1;
        if(node.right) {
            applyMethod(node.right,depth+1);
        }
    }
    applyMethod(root,0);
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
const Tree = (props) => {
    // transforms a tree into a list of x,y coordinates, one for each node
    const calculatePositions = knuthPosCalc;

    const nodePositions = calculatePositions(props.edgeMap, props.nodeCount);
    const nodes = []
    for (let i = 0; i < props.nodeCount; i++) {
        const [x,y] = nodePositions[i];
        nodes.push(
            (<Node key={i} x={x} y={y} />)
        );
    }
    const edges = [];
    for(let i = 0; i < props.nodeCount; i++) {
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

const TREE = {
    0: [1,2],
    1: [3,4],
    2: [5,6],
    3: [7,8],
}

ReactDOM.render(
  <React.StrictMode>
    <Tree nodeCount={9} edgeMap={TREE}/>
  </React.StrictMode>,
  document.getElementById('root')
);
