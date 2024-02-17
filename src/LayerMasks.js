// layers are collections of objects that are rendered by a camera
// only if it's also on that layer
// it uses a 32-but mask, but individual layers are specified by bit number
// You could use (1<<LAYER_name) to build the mask if needed


export const podsEye = 1    // Specific to the ATFLIR pod
export const podBack = 2



export const WORLD = 0       // all normal 3D objects in the GlobalScene

export const MAIN = 3       // things that we want to see in the main camera
export const LOOK = 4       // things that we want to see in the look camera
export const HELPERS = 5    // things like lines that we want ONLY in the main view, but not in the recreation

export const MASK_WORLD = (1<<WORLD);      // all normal 3D objects in the GlobalScene (default)
export const MASK_MAIN = (1<<MAIN);        // things that we want to see in the main camera
export const MASK_LOOK = (1<<LOOK);        // things that we want to see in the look camera
export const MASK_HELPERS = (1<<HELPERS)   // things like lines that we want ONLY in the main view, but not in the recreation

// Lighitng applies to all non-helpers
// generally this is just going to be stuff in WORLD group
// very few real ussage of this just MASK_MAIN or MASK_LOOK
export const MASK_LIGHTING = MASK_WORLD | MASK_MAIN | MASK_LOOK;

export const MASK_MAINRENDER = MASK_WORLD | MASK_MAIN | MASK_HELPERS
export const MASK_LOOKRENDER = MASK_WORLD | MASK_LOOK;


