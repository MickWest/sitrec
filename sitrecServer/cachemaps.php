<?php

// Example usage
// https://metabunk.org/sitrec/sitrecServer/cachemaps.php?url=https://mickwest.com/wp-content/uploads/2019/11/tftrh_3000x_podcast-art@025x.png
// http://local.metabunk.org/sitrec/sitrecServer/cachemaps.php?url=https://mickwest.com/wp-content/uploads/2019/11/tftrh_3000x_podcast-art@025x.png
//
//
// Actual usage: https://www.metabunk.org/sitrecServer/cachemaps.php?url=https%3A%2F%2Fs3.amazonaws.com%2Felevation-tiles-prod%2Fterrarium%2F9%2F129%2F191.png

// Requires a writable folder defined in config.php


require_once __DIR__ . '/config.php';
require_once __DIR__ . '/config_paths.php';

if (!isset($acceptable_domains)) {
    echo "No acceptable domains set in config.php";
    $acceptable_domains = [
        // none, as it's all in the config.php
    ];
}

$url = $_GET["url"];  // usage examples above

ob_start();			// output buffering, so the echo commands don't get sent (some servers will not send the header() if there's already output

echo "Attempting: ".$url."<br>";
$url = rawurldecode($url);
echo "Decoded: ".$url."<br>";

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
    // if the domain is not allowed, redirect to the URL
    // this will still allow the browser to fetch the image directly
    // and not use the server as a proxy
    // that will worok for anything except the mapbox url that needs an additional token
    header_remove();
    header("Location: " . $url);
    exit();


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
//if (strcmp($ext,"png") !== 0
//    && strcmp($ext,"jpg") !== 0
//)
//    exit("Illegal File Type ". $ext);

// given an array, $acceptable_extensions, of allowed extensions
// check to see if the extension is in the array
// if it's not, then exit
// if there is no array, or an empty array, then allow all extensions
if (isset($acceptable_extensions) && count($acceptable_extensions) > 0) {
    if (!in_array($ext, $acceptable_extensions)) {
        exit("Illegal File Type " . $ext);
    }
}


$hash = md5($url) . "." . $ext;

$cachePath = $CACHE_PATH . $hash;

$fileLocation = $CACHE_PATH;
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

    if($mapbox_token_env_var = getenv('MAPBOX_TOKEN')) {
        $token = "?access_token=" . $mapbox_token_env_var;
    }
    $token_url = "api.mapbox.com";

    // optional token for mapbox. Set in shared.env
    if (isset($token) && isset($token_url)) {
        if (strcmp($url_parts['host'], $token_url) === 0)
            $extra = $token;
    }

    // if we have curl, then use it
    if (function_exists('curl_init')) {
        echo "<br>Using curl";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . $extra);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.102011-10-16 20:23:10");

        // disable SSL verification
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $dataBlob = curl_exec($ch);
        if ($dataBlob === false) {
            echo "<br>FAILED to fetch " . $url . $extra;
            $info = curl_getinfo($ch);
            echo '<pre>';
            print_r($info);
            echo '</pre>';
            curl_close($ch);
            ob_end_flush();
            exit();
        }
        curl_close($ch);

    } else {
        // no curl, so use file_get_contents
        // reportedly less reliable

        $options = array(
            'http'=>array(
                'method'=>"GET",
                'header'=>"Accept-language: en\r\n" .
                    "Cookie: foo=bar\r\n" .  // check function.stream-context-create on php.net
                    "User-Agent: Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.102011-10-16 20:23:10\r\n" // i.e. An iPad
            )
        );
        $context = stream_context_create($options);

        echo "<br>Using file_get_contents";
        $dataBlob = file_get_contents($url . $extra, false, $context);
    }


    if ($dataBlob == false || strlen($dataBlob) === 0) {
        echo "<br>FAILED to fetch " . $url . $extra;
        if ($dataBlob == false) echo "<br>that returned false";
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


header_remove(); // Remove all previously set headers
header("Location: " . $cachePath);
exit();

