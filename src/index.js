import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

/*
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 300;
*/

const RADIUS = 10;
const STROKE_WIDTH = 4;
const NODE_SEP = 1;

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
const thinPosCalc = (root, positions, separation=1) => {
    const nexts = Array(positions.length).fill(0);
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
    applyMethod(root);
    return positions;
}


// only works on binary trees, uses in-order traversal
const knuthPosCalc = (root, positions) => {
    // there is no generalization to n-ary trees, so set non-left/right children to be at 0,0
    positions.fill([0,0]);
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

// do thinPosCalc with extra separation, then center parents over children in post-order
// can cause subtree collision
//
const parentBasedPosCalc = (root,positions) => {
    positions = thinPosCalc(root,positions,2);
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


// meta-function for methods that use offsets
const offsetBasedCalculation = (root, positions, method) => {
    // helper function for second pass on offset-based algos
    const applyOffsets = (node,positions,depth=0,mod=0) => {
        positions[node.id] = [SCALE*mod,SCALE*depth];
        if(node.children) {
            for(const child of node.children) {
                applyOffsets(child,positions,depth+1,mod+child.mod);
            }
        }
    }
    // calculate the offsets, then apply them to calculate the real coordinates
    method(root);
    applyOffsets(root,positions,1,1-root.leftmost);
    return positions;
}


const widePosCalc = (root, positions) => {
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
    return offsetBasedCalculation(root, positions, calcPos);
}


const buchheimPosCalc = (root,positions) => {
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
        node.leftmost = 0;
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
                node.leftmost = Math.min(node.leftmost, child.mod + child.leftmost);
            });
        }
    }
    return offsetBasedCalculation(root,positions,firstwalk);
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


const methods = [thinPosCalc,knuthPosCalc,parentBasedPosCalc,widePosCalc,buchheimPosCalc];
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
    [{ // From Walker's paper
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
