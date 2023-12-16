<?php

// Example usage
// https://metabunk.org/sitrec/sitrecServer/cachemaps.php?url=https://mickwest.com/wp-content/uploads/2019/11/tftrh_3000x_podcast-art@025x.png
// http://localhost/sitrec/sitrecServer/cachemaps.php?url=https://mickwest.com/wp-content/uploads/2019/11/tftrh_3000x_podcast-art@025x.png
//
//
// Actual usage: https://www.metabunk.org/sitrecServer/cachemaps.php?url=https%3A%2F%2Fs3.amazonaws.com%2Felevation-tiles-prod%2Fterrarium%2F9%2F129%2F191.png

// Requires a writable folder sitrec-cache/ on the same level as sitrec/
// so ../../sitrec-cache will point to it.


require __DIR__ . '/../../sitrec-config/cachemaps-config.php';

$url = $_GET["url"];  // usage e.g.

ob_start();			// output buffering, so the echo commands don't get sent (some servers will not send the header() if there's already output

echo "Attempting: ".$url."<br>";
$url = rawurldecode($url);
echo "Decoded: ".$url."<br>";


//function LoadCached($url) {

// Array of acceptable domains
$acceptable_domains = [
    'mickwest.com',  // for testing with the example above
    'c.tile.openstreetmap.org',
    'api.mapbox.com',
    'tiles.maps.eox.at',
    's3.amazonaws.com'
    // Add more domains as needed
];

// Parse the URL and return its components
$url_components = parse_url($url);

// Check if the URL parse was successful
if (false === $url_components) {
    // Invalid URL, return 403 (Forbidden)
    echo "Missing url ". $url . "<br>";
    http_response_code(403);
    return;
}

// Extract the host (domain) from the URL
$host = strtolower($url_components['host']);

// Check if the domain is in the list of acceptable domains
$domain_allowed = false;
foreach ($acceptable_domains as $domain) {
    if ($host === $domain || substr($host, -strlen($domain) - 1) === ".$domain") {
        $domain_allowed = true;
        break;
    }
}

if (!$domain_allowed) {
    // Domain is not acceptable, return 403
    echo "Disallowed domain " . $host ;
    ob_end_flush();
    http_response_code(403);
    return;
}

// It's an acceptable domain, continue with your logic
if (!isset($url_components['path'])) {
    // No path component in URL, handle the error or return 501
    ob_end_flush();
	http_response_code(501);
    return;
}

$path_parts = pathinfo($url_components['path']);
$ext = isset($path_parts['extension']) ? strtolower($path_parts['extension']) : '';


$url_parts = parse_url($url);

// patch up the mapbox jpg extension, which has the quality appended
if (strcmp($ext,"jpg80") === 0)
    $ext = "jpg";

// for hosts that don't have an extension, add the right one here.
if (strcmp($url_parts['host'],"tiles.maps.eox.at") === 0)
    $ext = "jpg";


// check for allowed extensions
//if ($ext !== "jpg" && $ext !== "jpg" && ext !== "png" && ext !=="tiff" )
//    if (!($ext === "jpg" || $ext === "jpg" || ext === "png" || ext ==="tiff") )
if (strcmp($ext,"png") !== 0
    && strcmp($ext,"jpg") !== 0
)
    exit("Illegal File Type ". $ext);

$hash = md5($url) . "." . $ext;

$cachePath = '../../sitrec-cache/' . $hash;

$fileLocation = "../../sitrec-cache/";
$cachedFile = $fileLocation . $hash;

//check if file exists
if (file_exists($cachedFile)) {
    echo "cached file exists\n";
    //check if file age is within 24 hours
    //
    /*

    if(time() - filemtime($cachedFile) > (24 * 3600)) {
        echo "cache is within 24 hours\n";
        // we now drop thought to the "header" redirect to this cached file
    }
    */
} else {

    echo "cache no found<br>";
    echo "<br>cachedFile: " . $cachedFile;
    echo "<br>cachedPath: " . $cachePath;

    //cache doesn't exist or is older than 24 hours
    //download it
    echo "<br>Fetching from host " . $url_parts['host'];



    $extra = "";
    if (strcmp($url_parts['host'],"api.mapbox.com") === 0)
        $extra = $token;

    $options = array(
        'http'=>array(
            'method'=>"GET",
            'header'=>"Accept-language: en\r\n" .
                "Cookie: foo=bar\r\n" .  // check function.stream-context-create on php.net
                "User-Agent: Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.102011-10-16 20:23:10\r\n" // i.e. An iPad
        )
    );
    $context = stream_context_create($options);

    $dataBlob = file_get_contents($url . $extra, false, $context);
    if ($dataBlob == false || strlen($dataBlob) === 0) {
        echo "<br>FAILED to fetch " . $url . $extra;
        if ($dataBlob == false) echo "<br>file_get_contents returned false";
        else echo "<br>$dataBlob zero size";
        ob_end_flush();
            exit();
        }
    echo "<br>Fetched";
    echo "<br>result size = ".strlen($dataBlob);
    // Save content into cache
    $status = file_put_contents($cachedFile, $dataBlob);
    if ($status === false) {
        echo "<br>WRITE FAILED " . $cachedFile;

        ob_end_flush();
		exit();
        }
    //return downloaded content as result
    // return dataBlob;
}

//header("Location: ../f/271341344.jpg");

//  $cachePath = "../f/271341344.jpg";

header_remove(); // Remove all previously set headers
header("Location: " . $cachePath);
exit();

//}

// http://mickwest.com/wp-content/uploads/2007/01/552.png

