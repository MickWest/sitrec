import { NodeMan } from '../Globals';
import { CNode } from './CNode';
import regression from '../js/regression';
import { assert } from '../assert.js';

export class CNodeMunge extends CNode {
  constructor(v) {
    super(v);
    this.munge = v.munge;

    // copy frame count from first input
    this.frames = v.frames ?? this.inputs[Object.keys(this.inputs)[0]].frames;

    // we allow a frame count of 0, to indicate a constant
    assert(
      this.frames !== undefined,
      'CNodeMunge missing frame count, unexpected, but tecnically legal'
    );
  }

  getValueFrame(f) {
    return this.munge.call(this, f);
  }
}

// derivative of number or vector nodes
// if a vector then it's per frame
// is a number, then PER SECOND
export class CNodeDerivative extends CNode {
  constructor(node, unsigned = true, order = 1) {
    node = NodeMan.get(node);
    super({ id: `${node.id}_d` });
    this.addInput('source', node);
    this.order = order;
    this.unsigned = unsigned;
    this.frames = node.frames;
    this.fps = node.fps;
  }

  getValueFrame(f) {
    if (f === this.frames - 1) f--;
    const v0 = this.in.source.v(f);
    if (v0.position !== undefined) {
      return { position: this.in.source.p(f + 1).sub(v0.position) };
    }

    const d = (this.in.source.v(f + 1) - v0) * this.fps;

    if (this.unsigned) return Math.abs(d);

    return d;
  }
}

// returns the g-force given a POSITION track
// if supplied with a wind track, then will subtract that, essentially subtracting the force of wind
// that will only have an effect if the wind is not constant
export class CNodeGForce extends CNode {
  constructor(node, components, windNode) {
    node = NodeMan.get(node);
    super({ id: `${node.id}_gForce${components.join('')}` });
    this.addInput('source', node);
    if (windNode) this.addInput('wind', windNode);
    this.frames = node.frames;
    this.fps = node.fps;
    this.components = components;
  }

  getValueFrame(f) {
    0;
    const originalF = f;
    // can't do the last two frames, and ignore the one before that
    // as final frames are often corrupt
    if (f > this.frames - 4) f = this.frames - 4;
    // get three points where the timestep between then is t = 1/fps
    let p0 = this.in.source.v(f);
    assert(p0.position !== undefined, 'CNodeGForce needs a position track');
    p0 = p0.position;
    let p1 = this.in.source.p(f + 1);
    let p2 = this.in.source.p(f + 2);
    if (this.in.wind) {
      const wind = this.in.wind.v(f);
      p0 = p0.clone().sub(wind);
      p1 = p1.clone().sub(wind);
      p2 = p2.clone().sub(wind);
    }
    // get two distance vectors
    const s1 = p1.clone().sub(p0);
    const s2 = p2.clone().sub(p1);
    // and one acceleration vector
    const a = s2.clone().sub(s1);
    // Equations of motion say
    // v = u + at
    // so a = (v-u)/t
    //
    // s1 = ut + 0.5at^2
    // v = u + at
    // s2 = vt + 0.5at^2
    // s2 = ut + at^2 + 0.5at^2
    // (s2-s1) = ut + at^2 + 0.5at^2 - ut - 0.5at^2
    // s2-s1 = at^2
    // here we've got a vector, so the actual g force is the length of this vector
    //
    // For sanity checks, use https://www.omnicalculator.com/physics/acceleration
    // e.g 1000 knots to 0 over 26 seconds is about -2g

    // isolate some components
    a.x *= this.components[0];
    a.y *= this.components[1];
    a.z *= this.components[2];

    // it's m/sec/sec so we need to divide this length by the square of the time step
    // and see above, s2-s1 = at^2
    // t = 1/fps  to multiply by the square of fps, same as dividing
    const g = (a.length() * this.fps * this.fps) / 9.81;

    return g;
  }
}

export class CNodeRegression extends CNode {
  constructor(node, order) {
    node = NodeMan.get(node);
    super({ id: `${node.id}_d` });
    this.addInput('source', node);
    this.frames = node.frames;
    this.order = order;
    this.recalculate();
  }

  getValueFrame(f) {
    return this.poly.predict(f)[1];
  }

  recalculate() {
    this.array = [];
    for (let i = 0; i < this.frames; i++) {
      this.array.push([i, this.in.source.v(i)]);
    }
    this.poly = regression.polynomial(this.array, {
      order: this.order,
      precision: 16,
    });
  }
}

export function makeMunge(node, index1, index2, scale = 1) {
  const localScale = scale;
  node = NodeMan.get(node);
  return new CNodeMunge({
    id: `${node.id}_munge`,
    inputs: { n: node },
    name: 'generic',
    munge: function (f) {
      if (index1 === undefined) return this.in.n.v(f);
      if (index2 === undefined) return this.in.n.v(f)[index1];

      return this.in.n.v(f)[index1][index2] * localScale;
    },
    frames: node.frames,
  });
}

export function makeComboNode(id, a, b, munge) {
  return new CNodeMunge({
    id: id,
    inputs: {
      a: a,
      b: b,
    },
    munge: function (f) {
      const a = this.in.a.v(f);
      const b = this.in.a.v(f);
      return munge(a, b);
    },
  });
}
