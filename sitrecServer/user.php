<?php

require __DIR__ . '/config.php';

// we check for an optional file that can be used to customize the user id
// this would be specific to your installation
// on metabunk it's used to check if the user is logged into Xenforo
// and if so, return the user id
// is this file does not exist, we return 99999998
$configPath = __DIR__ . '/../../sitrec-config/auth-config.php';

function getUserID() {
    global $configPath;
    if (file_exists($configPath)) {
        require $configPath;
        return getUserIDCustom();
    } else {
        return 99999998;
    }
}


// get a short directory unique to the user, OR an empty string if the user is not logged in
// this is used for the user's directory in the upload folder
// or will be the full path in an S3 bucket
function getShortDir($user_id)
{
    if ($user_id == 0) {
        return ""; // return an empty string if the user is not logged in
    }

    // convert user id to a string, as it might be an integer at this point
    $userDir = strval($user_id);


    return $userDir;
}

// return a directory unique to the user, OR an empty string if the user is not logged in
// does NOT create the directory, which you can do with:
//     if (!file_exists($userDir)) {
//        mkdir($userDir, 0777, true);
//    }
//
function getUserDir($user_id)
{
    global $uploadDir;
    if ($user_id == 0) {
        return ""; // return an empty string if the user is not logged in
    }

// Directory to store rehosted files
    $userDir = $uploadDir . getShortDir($user_id) . '/';

    return $userDir;
}


