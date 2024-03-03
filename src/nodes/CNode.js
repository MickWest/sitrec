//////////////////////////////////////////////////
// CNode is a general in/out node in a user defined graph
// of nodes that return a value for a given frame
// We use the concept of frames as the initial use is video analysis
// and we want exact values on frames. But we can use time as well.
//
// CNode is the base class for a variety of different nodes
// Each node has a object (inputs) which is a list of named noded that provide data to calculate the value of this node
// It also has a simple array object (outputs) which is all the noded that have this one as an input
//
// Root nodes are generally data or computation nodes
// leaf nodes are display nodes, the end product
// data node - contains some data, like an array
// computation node - performs some function on the input data nodes
// display node - displays the result on screen (like a graph or HUD) or in the 3D world (like a line or marker)
// a display node might also be an input, like something you can drag with the mouse

import {assert, degrees, scaleF2M, vdump} from '../utils.js'
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {par} from "../par";
import {CNodeFactory} from "./CNodeFactory";
import {NodeMan, Sit} from "../Globals";
import {V3} from "../threeExt";



var UniqueNodeNumber = 0;
var debugNodeNumber = 0;

// the node constructor takes a single object v
class CNode {
    constructor (v) {
        this.props = v;
        this.isNumber = true;
        this.fps = v.fps ?? 30          // fps = frames per second
        this.frames = v.frames ?? 0     // frames of zero means it's constant or time indepedent
        this.inputs = {}                // inputs are named
        this.outputs = []               // outputs are just an array of nodes
        this.visible = true;            // some nodes are display nodes
        this.addInputs(v.inputs)
        if (v.id != undefined) {
            this.id = v.id
        } else {
            // if no node id is given, then make a unique one
            this.id = this.constructor.name + UniqueNodeNumber++;
        }

        this.debugNodeNumber = debugNodeNumber++;

        // Add call stack property
        this.callStack = (new Error()).stack;

        NodeMan.add(this.id, this)
    }

    dispose() {
        // clear the inputs and outputs

        // remove this from the outputs of all the input nodes
        for (let key in this.inputs) {
            let input = this.inputs[key];
            input.outputs = input.outputs.filter(node => node !== this);
        }

        // and remove this from the inputs of all the output nodes
        for (let output of this.outputs) {
            output.inputs = Object.fromEntries(Object.entries(output.inputs).filter(([key, value]) => value !== this));
        }
        this.inputs = {}
        this.outputs = [];


    }  // any garbage collection

    // v0 = shorthand accessor for the value at 0,
    // usually for nodes that are not frame dependent
    get v0() {return this.v(0)}

    // "in" is just short for "inputs"
    get in() {return this.inputs}

    update(f) {
        // virtual function, derived nodes override to implement per-frame updates
        // here we just check f is defined to ensure derived update(f) functions
        // are passing it down
        assert(f !== undefined, "Something is not passing in f")
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    // check all the inputs in this array exist
    checkInputs(inputList) {
        inputList.forEach(key => assert(this.inputs[key] != undefined, "CNode Missing input -> "+ key ))
    }

    // check that we have one and only one of a list of inputs
    checkExclusiveInputs(inputList) {
        var numMatchingInputs = 0;
        inputList.forEach(key => {if (this.inputs[key] != undefined) numMatchingInputs++;})
        if (numMatchingInputs == 0)  assert( 0, "Zero matching inputs " )
        if (numMatchingInputs > 1)  assert( 0, ">1 matching inputs " )
    }

    // add an input node, and add this to its list of outputs
    // this is so a node can add a globally defined node, like GlobalTime, as a default input
    addInput(key, nodeID, optional = false) {
        assert(this.in.key === undefined, `Adding input ${key} that is already defined`)
        var node;
        if (nodeID instanceof CNode) {
            node = nodeID
        } else {
            if (optional) {
                // if optional, then do nothing if the node does not exist.
                if (!NodeMan.exists(nodeID))
                    return;
            }

            node = NodeMan.get(nodeID)
            assert(node instanceof CNode, "Non-Node with id=" + nodeID +"  found for input key=" + key)
        }

        this.inputs[key] = node;
        node.outputs.push(this)
    }

    addInputs(inputs) {
        if (inputs) {
            Object.keys(inputs).forEach(key => {
                assert(inputs[key] != undefined, "Node has undefined input = " + key)
                this.addInput(key, inputs[key])
            })
        }
    }

    // add an input node, and add this to its list of outputs
    input(i,optional=false) {
        // if declared in the input object, then check if it's a node or node name
        if (this.inputs[i] != undefined) {
            // by this point, it should be resolved into a node
            assert(this.inputs[i] instanceof CNode, "Node has none-node input -> " + i)
            return;
        }
        // not in inputs, so might be in the constructors props object, and could be any of:
        // - A node object
        // - A node ID for a node in NodeMan
        // - A constant value (this may need more checking, e.g. of type)

        if (this.props[i] === undefined) {
            if (optional) return;
            assert(0, "Node missing input " + i);
        }
        var sourceNode;
        if (this.props[i] instanceof CNode) {
            sourceNode = this.props[i]
        } else {
            if (NodeMan.exists(this.props[i]))
                sourceNode = NodeMan.get(this.props[i])
            else {
                // auto constants must be numbers
                assert(typeof this.props[i] === 'number', "Node with id "+i+" : "+this.props[i]+" not a node or number, probably name of noded that's not created")
                // it's not a node, and it is a number so wrap it in a CNodeConstant
                sourceNode = new CNodeConstant({value: this.props[i]})
            }
        }
        this.addInput(i, sourceNode)
    }

    requireInputs(inputList) { inputList.forEach(key =>
        this.input(key))
    }


    optionalInputs(inputList) { inputList.forEach(key =>
        this.input(key,true))
    }

    // this takes an object of nodes, as if specified in the normal way
    // addes them to this.props
    // and calls this.input on each one
    addMoreInputs(inputObject) {
        Object.assign(this.props,inputObject)
        for (var inputName in inputObject) {
            this.input(inputName)
        }
    }


// overridable, as we might have a variable framerate??
    // get the frame number from the time (in seconds)
    getFrameFromTime( time ) {
        return time * this.fps
    }

    //
    getValueTime(time) {
        const frame = getFrameFromTime(time)
        return getValue(frame)
    }

    // frame is usually an integer, but if not then we interpolate
    // if outside of the range, then extrapolate using the two first or last values
    getValue(frameFloat) {
      // TODO: better check like this
        if (!this.isNumber && this.getValueFrame(0).position === undefined) {
            var frameInt = Math.floor(frameFloat);
            assert (frameInt >= 0 && frameInt < this.frames, "out of range index on non-number")
            return this.getValueFrame(frameInt)
        }

        var value;
        if (!this.frames ) {
            value = this.getValueFrame(0);
        } else {
            if (frameFloat < 0) {
                // extrapolating backwards
                const value0 = this.getValueFrame(0)
                const value1 = this.getValueFrame(1)
                if (value0.position === undefined)
                    // note in both these interpolations, frameFloat is a negative number
                    // so we are essentially multiplying by v0-v1, even though we use v1-v0
                    if (typeof value0 === 'number' && typeof value1 === 'number') {
                        value = frameFloat * (value1 - value0) + value0
                    } else {
                        // interpolating raw 3D vectors
                        assert (value0.x !== undefined, "Extrapolating non-vector in "+this.id+ " frame " + frameFloat);
                        value = value1.clone().sub(value0).multiplyScalar(frameFloat).add(value0)         }
                else {
                    value = {...value0} // make a copy, so we can alter the position
                  //  console.log("Extrapolating "+vdump(value0)+ "<-" +vdump(value1)+" by "+frameFloat)
                    value.position = value1.position.clone().sub(value0.position).multiplyScalar(frameFloat).add(value0.position)
                }
            } else if (frameFloat > this.frames - 1) {
                // extrapolating forwards
                const value0 = this.getValueFrame(this.frames - 2)
                const value1 = this.getValueFrame(this.frames - 1)
                if (value0.position === undefined) {
                    // check it's a number
                    if (typeof value0 === 'number' && typeof value1 === 'number') {
                        value = value1 + (frameFloat - (this.frames - 1)) * (value1 - value0)
                    } else {
                        // interpolating raw 3D vectors
                        assert (value0.x !== undefined, "Extrapolating non-vector in "+this.id+ " frame " + frameFloat);
                        value = value1.clone().sub(value0).multiplyScalar(frameFloat-(this.frames-1)).add(value1)
                    }

                } else {
                    value = {...value0} // make a copy, so we can alter the position
                    value.position = value1.position.clone().sub(value0.position).multiplyScalar(frameFloat-(this.frames-1)).add(value1.position)
                    //console.warn("Extrapolated: "+vdump(value0)+" ... "+vdump(value1)+" by "+(frameFloat-(this.frames-1)) + " to "+vdump(value) + "STRIPPED ANY OTHER DATA");
                }
            } else {
                if (Number.isInteger(frameFloat)) {
                    value = this.getValueFrame(frameFloat)
                } else {
                    const frameInt = Math.floor(frameFloat)
                    const value0 = this.getValueFrame(frameInt)
                    const value1 = this.getValueFrame(frameInt+1)

                    if (value0.position === undefined)
                        value = value0 + (value1-value0) * (frameFloat - frameInt)
                    else {
                        //  value = value0 // to copy the color and other per-frame data
                        value = {}
                        value.position = value1.position.clone().sub(value0.position).multiplyScalar(frameFloat - frameInt).add(value0.position)
                    }
                }
            }
        }
        if (this.modify) value = this.modify(value)
        return value;
    }

    // v(f) is shorthand for getValue(f)
    // the structure of the returned value varies depending on the node
    // for example, v() for a track will often return a structure with {position:Vector3, and maybe color and heading}
    // use p() if you just want the position
    v(frameFloat) {
        return this.getValue(frameFloat)
    }

    // returns a new Vector3 with the track position
    // will work with either a track that returns a Vector3 or one that returns {position:Vector3, ...}
    p(frameFloat) {
        var pos = this.getValue(frameFloat)
        if (pos.position !== undefined)
            pos = pos.position;
        return pos.clone()
    }

    // We implement this with an assert to ensure derived classes implement it
    getValueFrame() {
        assert(0,"Should not call getValueFrame base implementation. Node missing getValueFrame implementation?")
    }


    recalculate() {

    }

    // return the frame number of the closest point on the track to the ray
    closestFrameToRay(ray) {
        var closestPoint = V3() // target.clone() // use the previosul found point, but should be overridden
        var closestDistance = 10000000000;
        var closestFrame = 0;
        for (var i=0;i<this.frames;i++)
        {
            const trackPoint = this.p(i)
            const rayPointDistance = ray.distanceToPoint(trackPoint)
            if (rayPointDistance < closestDistance) {
                closestPoint = trackPoint;
                closestDistance = rayPointDistance;
                closestFrame = i;
            }
        }
        return closestFrame
    }

    // return the value of the closest point on the track to the ray
    closestPointToRay(ray) {
        return this.getValueFrame(this.closestFrameToRay(ray))
    }


    // the length of the longest path from this to node
    // -1 if not found, 0 if this is the node
    maxDepthOf(node,depth=0,currentMax=-1) {
        // if this is the node, then possible new currentMax
        if (depth > currentMax && this == node)
            currentMax = depth;
        // otherwise recurse for each child, with a higher depth
        this.outputs.forEach(child =>
            currentMax = child.maxDepthOf(node,depth+1,currentMax))
        // and the result will bubble up
        return currentMax
    }

    // recalculate the contents of this node
    // then recalculate all the child nodes
    // TODO - possible out-of-order recalculation
    // need to cull child nodes that can be reached by other paths
    // so they don't get prematurely recalculated
    // the "depth" patameter here is just used for indenting.
    recalculateCascade(f, noControllers = false, depth = 0) {

        //  if (par.paused) {
        //     if (depth === 0) {
        //         console.log("\nRecalculate Start With "+ this.id)
        //     } else {
        //         console.log("|---".repeat(depth) + " " + this.id)
        //     }
        // }

        // bit of a patch - whenever we do a recalculateCascade we make sure we render one frame
        // so any changes are reflected in the display
        par.renderOne = true;

        if (f === undefined) f = par.frame;
        this.recalculate(f);



        // Controllers are a bit of a special case
        // they adjust a CNode3D's object, and that might depend on the value of that object
        // for example, lookAt depends on the position of the object to calculate the heading
        // so we need to reapply the controller after the object has been recalculated
        // but before the children are recalculated (as they might depend on the effect of the controller on this node)
        if (!noControllers && this.applyControllers !== undefined) {
            // if (par.paused) {
            //     console.log("|---".repeat(depth) + " Apply Controllers")
            // }
            this.applyControllers(f, depth)
        }

        this.outputs.forEach(output => {
            // Two additional things
            // If child is included multiple times in the graph (as a 1st generation child)
            // then only update it once
            // If we can get to this node in any other way (ie. child > 1st gneeration)
            // then DO NOT update it, as it needs intermediates updated first
            // (and 3rd, but elsewhere, no loops)

            // but for now this will work.
            output.recalculateCascade(f, noControllers, depth + 1)

        })

    }

    // given an array of values, print the resuts to the console
    testValues(values) {
        for (const v of values)  {
            console.log(`Test node (${v}) = ${this.v(v)}`)
        }
    }
}


// CNodeConstant needs to be in the CNode.js file otherwise it gets
// unresolvable circular dependencies in WebPack
export class CNodeConstant extends CNode {
    constructor(v) {
        super(v);
        assert(v.value != undefined, "Constant node needs value")
        this.value = v.value;
    }

    getValueFrame(frame) {
        return this.value
    }
}

export {CNode}

export class CNodePositionLLA extends CNode {
    constructor(v) {
        super(v);
        this.input("lat")
        this.input("lon")
        this.input("alt")
        this.recalculate()
    }

    recalculate() {
    }

    // return vector3 EUS for the specified LLA (animateabel)
    getValueFrame(f) {
        const lat = this.in.lat.v(f)
        const lon = this.in.lon.v(f)
        const alt = this.in.alt.v(f)
        return LLAToEUS(lat, lon, alt)
    }


}

export function makePositionLLA(id, lat, lon, alt) {
    return new CNodePositionLLA({
        id:id,
        lat: lat, lon: lon, alt: alt
    })
}


export class CNodeMovablePoint extends CNode {
    constructor(v) {
        super(v)
    }

}

// get heading in the XZ plane - i.e. the compass heading
export function trackHeading(source, f) {
    if (f > Sit.frames-2) f = Sit.frames-2; // hand out of range
    if (f < 0) f = 0
    var fwd = source.p(f+1).sub(source.p(f))
    var heading = degrees(Math.atan2(fwd.x, -fwd.z))
    return heading
}

// per frame velocity vector
// source = track object
// f = frame number
// given that source.p(f) is the position at frame f
// we calculate the velocity vector at f as the position at f+1 minus the position at f
export function trackVelocity(source, f) {
    if (f > Sit.frames-2) f = Sit.frames-2; // hand out of range
    if (f < 0) f = 0
    var fwd = source.p(f+1).sub(source.p(f))
    return fwd
}

// per frame direction vector (normalized velocity)
export function trackDirection(source, f) {
    return trackVelocity(source, f).normalize();
}



// per frame acceleration
// essential the first derivative of the position
export function trackAcceleration(source, f) {
    const v1 = trackVelocity(source,f)
    const v2 = trackVelocity(source,f+1)
    var fwd = v2.clone().sub(v1)
    return fwd
}

// per frame closing speed
// this is the chan
export function closingSpeed(jet, target, f) {
    var d1 = jet.p(f).sub(target.p(f)).length()
    var d2 = jet.p(f+1).sub(target.p(f+1)).length()
    return d1-d2

}


