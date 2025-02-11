<?php

// Directory to store shortened URLs

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/config_paths.php';
require_once __DIR__ . './user.php';
$user_id = getUserID();


// need to be logged in
if ($user_id === 0 ) {
    http_response_code(501);
    exit("Internal Server Error");
}

$queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
parse_str($queryString, $params);

if (isset($params['url'])) {
    $url = $params['url'];
//

    // Check if the URL contains the string "sitRecServer"
    if (strpos($url, 'sitrecServer') !== false) {
        echo "URL containing 'sitrecServer' is not allowed.";
        exit;
    }

    // Generate a unique code for the URL
    $code = generateUniqueCode($SHORTENER_PATH);

   // $shortURL = $_SERVER['HTTP_HOST'] . '/u/' . $code . '.html';

    $shortURL = $SHORTENER_URL . $code . '.html';

    $html = createRedirectHtml($url);

    // Save the URL to the filesystem
    file_put_contents($SHORTENER_PATH . $code . '.html', $html);

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

function generateUniqueCode($SHORTENER_PATH) {
    do {
        $code = generateRandomCode();
    } while (file_exists($SHORTENER_PATH . $code));
    return $code;
}
