<?php
require __DIR__ . '/../../sitrec-config/cachemaps-config.php';

if (!isset($cache_base_path)) {
    $cache_base_path = "../../sitrec-cache/";
}

// Lookup table for requests
$request_url_map = array(
    "CURRENT_STARLINK" => "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle"
);

$request = isset($_GET["request"]) ? $_GET["request"] : null;

// the request code might have a ?v=8234823958235 parameter at the end (with a random string)
// so strip that off (just strip off everything after the ?)
$request = strtok($request, "?");


if (!$request) {
    exit("No request");
}
if (!array_key_exists($request, $request_url_map)) {
    exit("Invalid request key ".$request);
}



$url = $request_url_map[$request];
$url_parts = parse_url($url);

if (!$url_parts || $url_parts['scheme'] !== 'https' || $url_parts['host'] !== 'celestrak.org') {
    exit("Illegal URL or scheme");
}

$path_parts = pathinfo($url);
$ext = strtolower($path_parts['extension']);

// for hosts that don't have an extension, add the right one here.
if (strcmp($url_parts['host'],"celestrak.org") === 0) {
    $ext = "tle";
}

if ($ext !== "tle") {
    exit("Illegal File Type " . $ext);
}

$hash = md5($url) . "." . $ext;
$cachePath = $cache_base_path . $hash;
$fileLocation = $cache_base_path;
$cachedFile = $fileLocation . $hash;

$lifetime = 60 * 60; // 1 hour

if (file_exists($cachedFile) && (time() - filemtime($cachedFile)) < $lifetime) {
    header("Location: " . $cachePath);
    exit();
} else {
    $options = array(
        'http'=>array(
            'method'=>"GET",
            'header'=>"Accept-language: en\r\n" .
                "Cookie: foo=bar\r\n" .  // check function.stream-context-create on php.net
                "User-Agent: Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.102011-10-16 20:23:10\r\n" // i.e. An iPad
        )
    );
    $context = stream_context_create($options);
    $dataBlob = file_get_contents($url, false, $context);

    if ($dataBlob === false || strlen($dataBlob) === 0) {
        exit("Failed to fetch the URL");
    }

    if (file_put_contents($cachedFile, $dataBlob) === false) {
        exit("Failed to write cache file");
    }

    header("Location: " . $cachePath);
    exit();
}
?>
