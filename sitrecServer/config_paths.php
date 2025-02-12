<?php

require_once __DIR__ . '/injectEnv.php';

// $APP_URL is the base URL for the site, e.g. "https://www.metabunk.org/sitrec" or "https://www.metabunk.org/somepath/another/sitrec/"
$APP_URL =  $_SERVER['REQUEST_SCHEME'] . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
// remove everything after the last slash (including the slash), that will give use the URL of the server directory
$APP_URL = substr($APP_URL, 0, strrpos($APP_URL, '/'));
// remove everything after the last slash (leaving the slash)
$APP_URL = substr($APP_URL, 0, strrpos($APP_URL, '/') + 1);
// and ROOT_URL is the base URL for the site"

// $APP_PATH is the base directory for the sitrec application
// used by getsitches.php to find the data directory
// it's just one level up from the current directory (phpServer
$APP_PATH = "../";


// $ROOT_IS_APP is true if the data directory is inside the app directory
// otherwise it's one directory above.
$ROOT_IS_APP = true;

// count the number of slashes in the APP_URL
// if there are more than 3, then the data directory is not inside the app directory
// so we set $ROOT_IS_APP to false
$slashCount = substr_count($APP_URL, '/');
if ($slashCount > 3)
{
    $ROOT_IS_APP = false;
}

// $ROOT_URL is the base URL for the site, e.g. "https://www.metabunk.org" or "https://www.metabunk.org/somepath/another/"
// ROOT_PATH is the base directory for the site on the server,
// It can be an absolute path, like "/var/www/html"
// or a relative path from the current directory (i.e. from sitrecServer/config.php)
// e.g. "../../" or "../"


if ($ROOT_IS_APP) {
    $ROOT_URL = $APP_URL;
    $ROOT_PATH = $APP_PATH;
} else {
// by default we have shorting, caching, and uploads as subdirectories of this
// start with the APP_URL, less the last slash
    $ROOT_URL = substr($APP_URL, 0, -1);
    $ROOT_URL = substr($APP_URL, 0, strrpos($ROOT_URL, '/') + 1);
    $ROOT_PATH = "../../";
}


// ROOT_PATH is the base directory for the site
// the default configuration is:
// $ROOT_PATH /
//     $ROOT_PATH /   (usually "sitrec/")
//         sitrecServer / (where all the PHP files are)
//             config.php   (this file)
//     sitrec-upload /  (for user uploads, sitches, videos, tracks, etc)
//     sitrec-cache / (cache for map tiles)
//     u / (shortened URLs)


// FILE_PATH is the base directory for sitrec-upload, sitrec-cache, and u
// the default installation has these as subdirectories of $ROOT_PATH
// but you could change this to be an absolute path
// or to use $ROOT_PATH as the base, or use $APP_PATH as the base if you want it inside the sitrec directory
$FILE_PATH = $ROOT_PATH;
$FILE_URL  = $ROOT_URL;

// The following are the DEFAULT values for the various directories
// you can change them, so long as you change both the directory and the URL
$UPLOAD_PATH = $FILE_PATH . "sitrec-upload/";
$UPLOAD_URL  = $FILE_URL  . "sitrec-upload/";

$CACHE_PATH  = $FILE_PATH . "sitrec-cache/";
$CACHE_URL   = $FILE_URL  . "sitrec-cache/";

// From shortener.php, for the short URLs
// to make as short as possible, we use a single letter for the directory
// you might want to consider using the server root instead of $FILE_PATH
$SHORTENER_PATH = $FILE_PATH . 'u/';
$SHORTENER_URL = $FILE_URL  . "u/";

$server_config = [
"UPLOAD"     => $UPLOAD_URL,
"CACHE"      => $CACHE_URL,
"UPLOAD_PATH" => $UPLOAD_PATH,
"CACHE_PATH"  => $CACHE_PATH,
"ROOT"       => $ROOT_URL,
"ROOT_PATH"  => $ROOT_PATH,
"APP"        => $APP_URL,
"APP_PATH"   => $APP_PATH,
    "ROOT_IS_APP" => $ROOT_IS_APP,


"SHORTENER"  => $SHORTENER_URL,
"SHORTENER_PATH" => $SHORTENER_PATH,
    "HTTP_HOST" => $_SERVER['HTTP_HOST'],
    "REQUEST_URI" => $_SERVER['REQUEST_URI'],
    "SERVER_NAME" => $_SERVER['SERVER_NAME'],
    "SERVER_ADDR" => $_SERVER['SERVER_ADDR'],
    "SERVER_PORT" => $_SERVER['SERVER_PORT'],
    "SERVER_PROTOCOL" => $_SERVER['SERVER_PROTOCOL'],
];


// if there is a FETCH_CONFIG parameter, then we are fetching the config
if (isset($_GET["FETCH_CONFIG"])) {
echo json_encode($server_config);
exit (0);
}
