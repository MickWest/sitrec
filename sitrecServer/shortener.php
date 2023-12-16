<?php

// Directory to store shortened URLs
$storageDir = '../../u/';


$fileDir = '../../';  # relative path from this script to the Xenforo root
require($fileDir . '/src/XF.php');
XF::start($fileDir);
$app = XF::setupApp('XF\Pub\App');
$app->start();
//print_r (XF::visitor());  # dumps entire object
//print("<br>");
$user=XF::visitor();
//print ($user->user_id."<br>"); # = 1 (0 if nobody logged in)

// need to be logged in, and a memmber of group 9 (Verified users)
if ($user->user_id == 0 || !in_array(9,$user->secondary_group_ids)) {
    http_response_code(501);
    exit("Internal Server Error");
}

//if (in_array(18,$user->secondary_group_ids))
//    print ("Group 18<br>");

//print($user->username."<br>"); # = "Mick West"


$queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
parse_str($queryString, $params);

if (isset($params['url'])) {
    $url = $params['url'];
//
//// Check if the "url" parameter is provided
//if (isset($_GET['url'])) {
//    $url = $_GET['url'];

    // Check if the URL contains the string "sitRecServer"
    if (strpos($url, 'sitrecServer') !== false) {
        echo "URL containing 'sitRecServer' is not allowed.";
        exit;
    }

    if (strpos($url, 'sitrecServer') !== false) {
        echo "URL containing 'sitRecServer' is not allowed.";
        exit;
    }

    // Generate a unique code for the URL
    $code = generateUniqueCode($storageDir);

    $shortURL = $_SERVER['HTTP_HOST'] . '/u/' . $code . '.html';

    $html = createRedirectHtml($url);

    // Save the URL to the filesystem
    file_put_contents($storageDir . $code . '.html', $html);

    // Return the shortened URL to the client
    echo $shortURL;
} else {
    echo "Please provide a URL to shorten.";
}


function createRedirectHtml($url) {
    return '<html><head><meta http-equiv="refresh" content="0;url=' . $url . '"></head></html>';
}

function generateRandomCode($length = 6) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

function generateUniqueCode($storageDir) {
    do {
        $code = generateRandomCode();
    } while (file_exists($storageDir . $code));
    return $code;
}
