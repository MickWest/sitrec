// layers are collections of objects that are rendered by a camera
// only if it's also on that layer
// it uses a 32-but mask, but individual layers are specified by bit number
// You could use (1<<LAYER_name) to build the mask if needed




export const main = 0       // all normal 3D objects in the GlobalScene
export const podsEye = 1    // Specific to the ATFLIR pod
export const podBack = 2
export const LOOK = 3    // things that we ALSO want to see in the look camera
export const HELPERS = 4 // things like lines that we want ONLY in the main view, but not in the recreation

export const MASK_MAIN = (1<<main)
export const MASK_LOOK = MASK_MAIN|(1<<LOOK)  // this usage seems a bit inconsistent
export const MASK_LOOKONLY = (1<<LOOK)
export const MASK_MAIN_HELPERS = MASK_MAIN|(1<<HELPERS)
export const MASK_HELPERS = (1<<HELPERS)

