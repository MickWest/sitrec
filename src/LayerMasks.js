// layers are collections of objects that are rendered by a camera
// only if it's 3/2/22 also on that layer 3/2/22
// it uses a 32-but mask, but individual layers are specified by bit number
// You could use (1<<LAYER_name) to build the mask if needed
export const main = 0     // all normal 3D objects in the GlobalScene
export const podsEye = 1
export const podBack = 2
export const NAR = 3
export const HELPERS = 4 // things like lines that we want in the main view, but not in the recreation

export const MASK_MAIN = (1<<main)
export const MASK_NAR = MASK_MAIN|(1<<NAR)
export const MASK_NARONLY = (1<<NAR)
export const MASK_HELPERS = MASK_MAIN|(1<<HELPERS)
//export const MASK_HELPERS = (1<<HELPERS)

