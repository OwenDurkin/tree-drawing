import React from 'react';
import ReactDOM from 'react-dom';

const SCREEN_WIDTH = 1618;
const SCREEN_HEIGHT = 1000;

const RADIUS = 10;
const STROKE_WIDTH = 4;

// FUNCTIONS FOR TREE DRAWING

// crappy thing I came up with based on skimming that one article
// http://llimllib.github.io/pymag-trees/
const bfsPosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount);
    const queue = [[0,0]];
    let trackedLevel = 0;
    let [x,y] = [30,30]
    while(queue.length > 0) {
        const [curNode, curLevel] = queue.shift();
        if(curLevel > trackedLevel) {
            trackedLevel = curLevel;
            x = 30;
            y += 30;
        }
        positions[curNode] = [x,y];
        x += 30;
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
    const calculatePositions = bfsPosCalc;

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
        if (curEdges==undefined) {
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

ReactDOM.render(
  <React.StrictMode>
    <Tree nodeCount={9} edgeMap={{
        0: [1,2],
        1: [3,4],
        2: [5,6],
        3: [7,8],
    }}/>
  </React.StrictMode>,
  document.getElementById('root')
);
