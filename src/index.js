import React from 'react';
import ReactDOM from 'react-dom';

import {RADIUS, STROKE_WIDTH, NODE_SEP, SCALE,} from './config.js'
import {TREES,} from './data.js'
import {thinPosCalc, knuthPosCalc, parentBasedPosCalc, widePosCalc, buchheimPosCalc} from './strategies.js';
import './index.css';

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
        parent: null,
    }; 
    const queue = [root];
    while (queue.length > 0) {
        const cur = queue.shift();
        const childrenIds = edgeMap[cur.id];
        if (childrenIds == null) {
            continue;
        }
        const children = childrenIds.map((id) => {
            const child = { id: id, children: null, parent: cur};
            return child;
        });
        cur["children"] = children;
        children.map(x => queue.push(x));
    }
    return root;
}

// ACTUAL REACT COMPONENTS

const Node = (props) => (
    <circle
        cx={props.x}
        cy={props.y}
        r={RADIUS}
        style={{fill:"black",stroke:"black"}}
    />
);


const TreeDrawing = (props) => {
    const nodes = [];
    const edges = [];
    for (let i = 0; i < props.nodeCount; i++) {
        const [px,py] = props.nodePositions[i];
        nodes.push(
            (<Node key={i} x={px} y={py} />)
        );
        const childIndices = props.edgeMap[i];
        if (childIndices === undefined) {
            continue;
        }
        for(let j = 0; j < childIndices.length; j++) {
            const childIdx = childIndices[j];
            const [cx,cy] = props.nodePositions[childIdx];
            // draw a line from the parent node to the child node
            edges.push((
                <line
                    key={[i,j]} x1={px} y1={py} x2={cx} y2={cy}
                    stroke="black" strokeWidth={STROKE_WIDTH}
                />
            ));
        }
    }
    return (
        <svg width={props.width} height={props.height}>
            {nodes}
            {edges}
        </svg>
    );
}


const methods = [thinPosCalc,knuthPosCalc,parentBasedPosCalc,widePosCalc,buchheimPosCalc,];
// A "Forest" is a row of tree drawings for a given tree- one for each method in methods
const Forest = (props) => {
    const drawings = methods.map((method) => {
        const root = edgeMapToRootNode(props.edgeMap);
        const positions = Array(props.nodeCount);
        method(root,positions);

        let width = 0;
        let height = 0;
        positions.forEach((xycoord) => {
            const [x,y] = xycoord;
            width = Math.max(width, x);
            height = Math.max(height, y);
        });
        return (
            <div className="Column" key={method.name}>
                <h1>{method.name.substr(0,method.name.search("Pos"))}</h1>
                <TreeDrawing
                    nodePositions={positions}
                    edgeMap={props.edgeMap}
                    nodeCount={props.nodeCount}
                    width={width+SCALE}
                    height={height+SCALE}
                />
            </div>
        );
    });
    return (
        <div className="Row">
            {drawings}
        </div>
    );
}


const alltreedrawings = TREES.map((tree,i) => (
    <Forest key={i} nodeCount={tree[1]} edgeMap={tree[0]} />)
);

ReactDOM.render(
  <React.StrictMode>
    {alltreedrawings}
  </React.StrictMode>,
  document.getElementById('root')
);
