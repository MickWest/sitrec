<?php
// This is specific to the Starlink historical data from Space-Track.org
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/config_paths.php';

// space-data in config.php should look like this:
//
// $spaceDataUsername = 'somthing@example.com';
// $spaceDataPassword = 'somepassword';

// need to ensure we are logged in first
//require_once __DIR__ . '/user.php';
//$userID = getUserID();
//if ($userID == "") {
//    exit("Not logged in");
//}

$zipIt = true;

$starlink_cache = $CACHE_PATH . "starlink/";

// make sure the "starlink" folder exists in the cache directory
if (!file_exists($starlink_cache)) {
    mkdir($starlink_cache);
}

// called like: localhost/sitrec/sitrecServer/proxyStarlink.php?request=2024-07-18
$request = isset($_GET["request"]) ? $_GET["request"] : null;

// the request code might have a ?v=8234823958235 parameter at the end (with a random string)
// so strip that off (just strip off everything after the ?)
$request = strtok($request, "?");

if (!$request) {
    exit("No request");
}

// validate the request and make sure it's in the right format
// (and for security)
if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $request)) {
    exit("Invalid request key ".$request);
}

// Whitelist the allowed types explicitly
$allowed_types = ["", "LEO"];

$type = isset($_GET["type"]) ? $_GET["type"] : "";
if (!in_array($type, $allowed_types, true)) {
    exit("Invalid type parameter");
}

// given request in the form of YYYY-MM-DD
// calculate nextDay in the same form, and use 2 days later
$nextDay = date('Y-m-d', strtotime($request . ' +2 days'));

// the default STARLINK query
$url = "https://www.space-track.org/basicspacedata/query/class/gp_history/CREATION_DATE/" . $request . "--" . $nextDay . "/orderby/NORAD_CAT_ID,EPOCH/format/3le/OBJECT_NAME/STARLINK~~";

// override for LEO query
if ($type == "LEO") {
    $url = "https://www.space-track.org/basicspacedata/query/class/gp_history/EPOCH/" . $request . "--" . $nextDay . "/MEAN_MOTION/>11.25/ECCENTRICITY/<0.25/OBJECT_TYPE/payload/orderby/NORAD_CAT_ID,EPOCH/format/3le";
}

// encode angle brackets for compatibility with cURL
$url = encodeAngleBrackets($url);

// File naming setup
$baseFileName = $request . $type;
$cachedTLE = $starlink_cache . $baseFileName . ".tle";
$cachedZIP = $starlink_cache . $baseFileName . ".tle.zip";


if ($zipIt) {
// If the .zip file already exists, return it
    if (file_exists($cachedZIP)) {
        header("Location: " . $cachedZIP);
        exit();
    }

// If there's an existing .tle file, zip it and return
    if (file_exists($cachedTLE)) {
        if (zipTLE($cachedTLE, $cachedZIP, $baseFileName . ".tle")) {
            unlink($cachedTLE);
            header("Location: " . $cachedZIP);
            exit();
        } else {
            exit("Failed to create ZIP from existing TLE");
        }
    }
} else {
// If the .tle file already exists, return it
    if (file_exists($cachedTLE)) {
        header("Location: " . $cachedTLE);
        exit();
    }
}

// retrieve Space-Track login credentials from environment
$username = getenv('SPACEDATA_USERNAME');
$password = getenv('SPACEDATA_PASSWORD');

// Space-Track.org login URL
$loginUrl = 'https://www.space-track.org/ajaxauth/login';

// Space-Track.org data query URL (calculated earlier)
$dataUrl = $url;

// Initialize cURL session
$ch = curl_init();

// Set cURL options for login
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['identity' => $username, 'password' => $password]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookies.txt'); // Save cookies for subsequent requests
curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookies.txt'); // Use saved cookies

// Execute login request
$response = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Check for login errors
if ($http_status !== 200) {
    echo $response;
    die('Login failed. Check your credentials.');
}

// Set cURL options for data query
curl_setopt($ch, CURLOPT_URL, $dataUrl);
curl_setopt($ch, CURLOPT_POST, false);
curl_setopt($ch, CURLOPT_HTTPGET, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, false); // Set to false to exclude headers from the response

// Execute data query request
$data = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Close cURL session
curl_close($ch);


// Check for data query errors, and zero length data
if ($data === false || empty($data)) {
    die('Data query failed or returned no results.');
}

// Check for HTTP errors
if ($http_status !== 200) {
    echo $data;
    die('Data query failed with HTTP status code: ' . $http_status . "<br>" . $data);
}


// check that the first line contains "STARLINK" if the default type
$lines = explode("\n", $data);
if ($type == "" && strpos($lines[0], "STARLINK") === false) {
    die('STARLINK is not in the first line of the data.');
}

// Write the raw TLE file
if (file_put_contents($cachedTLE, $data) === false) {
    exit("Failed to write TLE cache file");
}

if ($zipIt) {
// Create zip archive from TLE file
    if (!zipTLE($cachedTLE, $cachedZIP, $baseFileName . ".tle")) {
        exit("Failed to create zip file");
    }

// Delete the .tle file after zipping
    unlink($cachedTLE);

// Redirect to .zip file
    header("Location: " . $cachedZIP);
} else {
// Redirect to .tle file
    header("Location: " . $cachedTLE);
}

exit();


// Helper to encode < and > in a Space-Track URL
function encodeAngleBrackets($url) {
    return str_replace(['<', '>'], ['%3C', '%3E'], $url);
}

// Helper to zip a .tle file
function zipTLE($tleFile, $zipFile, $tleNameInZip) {
    $zip = new ZipArchive();
    if ($zip->open($zipFile, ZipArchive::CREATE) === TRUE) {
        $zip->addFile($tleFile, $tleNameInZip);
        $zip->close();
        return true;
    }
    return false;
}
?>
