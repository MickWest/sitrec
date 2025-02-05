<?php
// This is specific to the Starlink historical data from Space-Track.org
require __DIR__ . '/config.php';

// space-data in config.php should look like this:
//
// $spaceDataUsername = 'somthing@example.com';
// $spaceDataPassword = 'somepassword';

// need to ensure we are logged in first
//require __DIR__ . '/user.php';
//$userID = getUserID();
//if ($userID == "") {
//    exit("Not logged in");
//}

$starlink_cache = $cache_base_path . "/starlink/";

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
if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $request)) {
    exit("Invalid request key ".$request);
}

// given request in the form of YYYY-MM-DD
// calculate nextDay in the same form
$nextDay = date('Y-m-d', strtotime($request . ' +1 day'));

// get the URL in this format
// https://www.space-track.org/basicspacedata/query/class/gp_history/CREATION_DATE/2023-12-22--2023-12-23/orderby/NORAD_CAT_ID,EPOCH/format/3le/OBJECT_NAME/STARLINK~~
$url = "https://www.space-track.org/basicspacedata/query/class/gp_history/CREATION_DATE/" . $request . "--" . $nextDay . "/orderby/NORAD_CAT_ID,EPOCH/format/3le/OBJECT_NAME/STARLINK~~";

$fileLocation = $starlink_cache;
$cachedFile = $fileLocation . $request . ".tle";

// we cache these forever
if (file_exists($cachedFile) ) {
    header("Location: " . $cachedFile);
    exit();
} else {





    $username = $spaceDataUsername;
    $password = $spaceDataPassword;

// Space-Track.org login URL
    $loginUrl = 'https://www.space-track.org/ajaxauth/login';

// Space-Track.org data query URL (calculated earlier
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

    // Get HTTP status code
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

// Check for data query errors, and zero length data
    if ($data === false || empty($data)) {
        die('Data query failed or returned no results.');
    }

    // check that the first line contains "STARLINK"
    $lines = explode("\n", $data);
    if (strpos($lines[0], "STARLINK") === false) {
        die('Data query failed or returned no results.');
    }


    if (file_put_contents($cachedFile, $data) === false) {
        exit("Failed to write cache file");
    }

    curl_close($ch);


    header("Location: " . $cachedFile);
    exit();
}
?>
