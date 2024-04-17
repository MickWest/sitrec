<?php

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

function getUserDir($user_id)
{
    if ($user_id == 0) {
        return ""; // return an empty string if the user is not logged in
    }

// Directory to store rehosted files
    $storageDir = '../../sitrec-upload/';

// Create a directory for the user if it doesn't exist
    $userDir = $storageDir . $user_id . '/';


    if (!file_exists($userDir)) {
        mkdir($userDir, 0777, true);
    }
    return $userDir;
}


