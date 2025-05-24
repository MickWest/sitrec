use wasm_bindgen::prelude::*;

// Define a struct to represent the input ECI coordinates
// #[wasm_bindgen]
// pub struct EciCoordinates {
//     pub x: f64,
//     pub y: f64,
//     pub z: f64,
// }

// Implement a constructor for EciCoordinates
// #[wasm_bindgen]
// impl EciCoordinates {
//     #[wasm_bindgen(constructor)]
//     pub fn new(x: f64, y: f64, z: f64) -> EciCoordinates {
//         EciCoordinates { x, y, z }
//     }
// }
//
// // Define a struct to represent the output geodetic coordinates
// #[wasm_bindgen]
// pub struct GeodeticCoordinates {
//     pub longitude: f64,
//     pub latitude: f64,
//     pub height: f64,
// }

// The function to expose to JavaScript
#[wasm_bindgen]
pub fn eci_to_geodetic(
    x: f64,   // ECI x-coordinate in kilometers
    y: f64,   // ECI y-coordinate in kilometers
    z: f64,   // ECI z-coordinate in kilometers
    gmst: f64 // Greenwich Mean Sidereal Time in radians
) -> Vec<f64> {
    let a = 6378.137; // semi-major axis (Earth's radius at equator) in km
    let b = 6356.752_314_2; // semi-minor axis (Earth's radius at poles) in km
    let r = (x * x + y * y).sqrt();
    let f = (a - b) / a; // flattening factor
    let e2 = 2.0 * f - f * f; // square of eccentricity
    let mut longitude = y.atan2(x) - gmst;

    // Normalize longitude to the range [-π, π]
    while longitude < -std::f64::consts::PI {
        longitude += std::f64::consts::TAU;
    }
    while longitude > std::f64::consts::PI {
        longitude -= std::f64::consts::TAU;
    }

    let mut latitude = z.atan2(r);
    let mut c;

    // Iterate to calculate latitude
    for _ in 0..20 {
        let sin_latitude = latitude.sin();
        c = 1.0 / (1.0 - e2 * sin_latitude * sin_latitude).sqrt();
        latitude = (z + a * c * e2 * sin_latitude).atan2(r);
    }

    c = 1.0 / (1.0 - e2 * latitude.sin().powi(2)).sqrt();
    let height = r / latitude.cos() - a * c;

    // Return the geodetic coordinates as an array [longitude, latitude, height]
    vec![
        longitude, // Longitude in radians
        latitude, // Latitude in radians
        height                  // Height in kilometers
    ]
}