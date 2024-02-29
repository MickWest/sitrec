<?php

function getUserID()
{
    if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
        // for local testing
        $user_id = 99999999;
    } else {
        // This code is specific to the metabunk.org implementation.
        // if you want to use this code on your own site, you'll need to modify it.
        // or use the local testing code above

        $fileDir = '../../';  # relative path from this script to the Xenforo root
        require($fileDir . '/src/XF.php');
        XF::start($fileDir);
        $app = XF::setupApp('XF\Pub\App');
        $app->start();
        //print_r (XF::visitor());  # dumps entire object
        //print("<br>");
        $user = XF::visitor();
        //print ($user->user_id."<br>"); # = 1 (0 if nobody logged in
        $user_id = $user->user_id;
    }
    return $user_id;
}

function getUserDir()
{
    $user_id = getUserID();
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


