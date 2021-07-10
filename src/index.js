import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

/*
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 300;
*/

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




// TREE DRAWING METHODS


// the Wetherell/Shannon algo works according to the python article
const thinPosCalc = (edgeMap, nodeCount, separation=1) => {
    const nexts = Array(nodeCount).fill(0);
    const positions = Array(nodeCount);
    const applyMethod = (node,depth=0) => {
        positions[node.id] = [SCALE*(separation*nexts[depth]+1),SCALE*(depth+1)]
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

// helper function for second pass on offset-based algos
const applyOffsets = (positions,node,depth=0,mod=0) => {
    positions[node.id] = [SCALE*mod,SCALE*depth];
    if(node.children) {
        for(const child of node.children) {
            applyOffsets(positions,child,depth+1,mod+child.mod);
        }
    }
}


// do thinPosCalc with extra separation, then center parents over children in post-order
const parentBasedPosCalc = (edgeMap,nodeCount) => {
    const root = edgeMapToRootNode(edgeMap);
    const positions = thinPosCalc(edgeMap,nodeCount,2);
    const center = (node) => {
        // post-order ~ bottom-up
        if (node.children) {
            for (const child of node.children) {
                center(child);
            }
            const l_child = node.children[0];
            const r_child = node.children[node.children.length-1];
            positions[node.id][0] = (positions[l_child.id][0] + positions[r_child.id][0])/2
        }
    }
    center(root);
    return positions;
}


const NODE_SEP = 1;
const widePosCalc = (edgeMap, nodeCount) => {
    const positions = Array(nodeCount);
    const root = edgeMapToRootNode(edgeMap);
    const calcPos = (node) => {
        node.mod = 0;
        node.rightmost = 0;
        node.leftmost = 0;
        if(node.children) {
            let mod = 0;
            node.children.forEach((child,i) => {
                calcPos(child);
                if(i > 0) {
                    const prev = node.children[i-1];
                    const offset = prev.rightmost-child.leftmost+NODE_SEP;
                    mod += offset;
                    child.mod = mod;
                }
            });
            // center parent above children
            node.children.forEach((child) => {
                child.mod -= mod/2;
            });
            const l_child = node.children[0];
            node.leftmost = l_child.mod + l_child.leftmost;
            const r_child = node.children[node.children.length-1]; 
            node.rightmost = r_child.mod + r_child.rightmost;
        }
    }
    calcPos(root);
    applyOffsets(positions,root,1,1-root.leftmost);
    return positions;
}


const buchheimPosCalc = (edgeMap,nodeCount) => {
    const positions = Array(nodeCount);
    const root = edgeMapToRootNode(edgeMap);

    // returns a contour of the given subtree with given root
    // contour entries denote maximum x distance from the root node
    // comp is a comparator function
    //   (e.g. Math.max for right contour, Math.min for left contour)
    const calcContour = (rootNode, comp) => {
        let contour = [0];
        // mode ~ relative x wrt rootNode
        const applyMethod = (node, depth=0, mod=0) => {
            // this is the first node we have visited on this level
            if (depth >= contour.length) {
                contour.push(mod);
            }
            // we have visited this depth before; check to update the contour at this depth
            else {
                contour[depth] = comp(contour[depth],mod);
            }
            if(node.children) {
                node.children.forEach((child) => {
                    applyMethod(child,depth+1,mod+child.mod);
                });
            }
        }
        applyMethod(rootNode);
        return contour;
    }

    // determines the appropriate mod value for the right subtree with respect to the left
    const calcPush = (leftContour,rightContour) => {
        let maxSep = 0;
        const maxIter = Math.min(leftContour.length,rightContour.length);
        for (let i = 0; i < maxIter; i++) {
            const rx = rightContour[i];
            const lx = leftContour[i];
            maxSep = Math.max(maxSep, rx-lx);
        }
        return maxSep + NODE_SEP;
    }

    // center children over parents
    const firstwalk = (node) => {
        node.mod = 0;
        if(node.children) {
            // calculate sub-trees
            node.children.forEach((child) => {
                firstwalk(child);
            });

            // determine how for each sub-tree needs to be pushed
            let mod = 0;
            let rightContour = calcContour(node.children[0],Math.max);
            node.children.forEach((child,i) => {
                if (i > 0) {
                    const leftContour = calcContour(child,Math.min);
                    // const prevNode = node.children[i-1];
                    const offset = calcPush(leftContour,rightContour);
                    mod += offset;
                    child.mod = mod;
                    const newRightContour = calcContour(child,Math.max);
                    rightContour.map(x => x-offset);
                    for(let j = 0; j < newRightContour; j++) {
                        if (j >= rightContour.length) {
                            rightContour.push(newRightContour[j]);
                        }
                        else {
                            rightContour[j] = Math.max(rightContour[j],newRightContour[j]);
                        }
                    }
                }
            });
            // center the parent over the children 
            node.children.forEach((child) => {
                child.mod -= mod/2;
            });
        }
    }
    // determine mod values for each node (subtree)
    firstwalk(root);
    // determine actual x coordinates for each node according to mod values
    applyOffsets(positions,root);
    // some nodes will have negative x-coordinates: push off-screen nodes to the right
    let min_x = 0;
    for (const [x,] of positions) {
        min_x = Math.min(min_x,x);
    }
    for (let i = 0; i < nodeCount; i++) {
        positions[i] = [positions[i][0]-min_x+SCALE,positions[i][1]+SCALE];
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


const TreeDrawing = (props) => {
    const nodes = [];
    const edges = [];
    for (let i = 0; i < props.nodeCount; i++) {
        const [x,y] = props.nodePositions[i];
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
                x1={props.nodePositions[i][0]}
                y1={props.nodePositions[i][1]}
                x2={props.nodePositions[c][0]}
                y2={props.nodePositions[c][1]}
                stroke="black"
                strokeWidth={STROKE_WIDTH}
            />));
        }
    }
    return (
        <svg width={props.width} height={props.height}>
            {nodes}
            {edges}
        </svg>
    );
}


const methods = [thinPosCalc, knuthPosCalc,parentBasedPosCalc,widePosCalc,buchheimPosCalc];
const Forest = (props) => {
    const methodPositions = methods.map((method,i) => 
        method(props.edgeMap,props.nodeCount)
    );
    const drawings = methodPositions.map((methodPosition,i) => {
        let width = 0;
        let height = 0;
        methodPosition.forEach((xycoord) => {
            const [x,y] = xycoord;
            width = Math.max(width, x);
            height = Math.max(height, y);
        });
        return (
            <div className="Column" key={i}>
                <h1>{methods[i].name.substr(0,methods[i].name.search("Pos"))}</h1>
                <TreeDrawing
                    nodePositions={methodPosition}
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
