import React from 'react';
import ReactDOM from 'react-dom';

const SCREEN_WIDTH = 1618;
const SCREEN_HEIGHT = 1000;

const RADIUS = 10;
const STROKE_WIDTH = 4;

const Node = (props) => (
    <circle
        cx={props.x}
        cy={props.y}
        r={RADIUS}
        style={{fill:"black",stroke:"black"}}
    />
);


const Tree = (props) => {
    const nodes = Array(20).fill().map((undef,i) =>
        (<Node
            key={i}
            x={20}
            y={30*(i+1)}
        />)
    );
    const edges = Array(19).fill().map((undef,i) =>
        (<line
            key={i}
            x1={nodes[i].props.x}
            y1={nodes[i].props.y}
            x2={nodes[i+1].props.x}
            y2={nodes[i+1].props.y}
            stroke="black"
            strokeWidth={STROKE_WIDTH}
        />)
    );
    return (
        <svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            {nodes}
            {edges}
        </svg>
    );
}

ReactDOM.render(
  <React.StrictMode>
    <Tree/>
  </React.StrictMode>,
  document.getElementById('root')
);
