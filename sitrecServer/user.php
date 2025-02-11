<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/config_paths.php';

function getUserID() {
  return getUserIDCustom();
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
    global $UPLOAD_PATH;
    if ($user_id == 0) {
        return ""; // return an empty string if the user is not logged in
    }

// Directory to store rehosted files
    $userDir = $UPLOAD_PATH . getShortDir($user_id) . '/';

    return $userDir;
}


