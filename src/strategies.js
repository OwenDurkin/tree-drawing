import {NODE_SEP, SCALE} from './config.js';

// TREE DRAWING METHODS


// the Wetherell/Shannon algo works according to the python article
export const thinPosCalc = (root, positions, separation=1) => {
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
export const knuthPosCalc = (root, positions) => {
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
export const parentBasedPosCalc = (root,positions) => {
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


export const widePosCalc = (root, positions) => {
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


export const buchheimPosCalc = (root,positions) => {
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


