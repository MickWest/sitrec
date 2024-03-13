<?php

// find all the sitches in the sitrec/data folder and return them as a json object
// a sitchs is a folder with a file inside it with the same name with a .sitch.js extension
// The file contains a text description of the sitch in javascript object notation

function getSitches()
{

// get the list of folders in the data folder
    $dir = "../data";
    $files = scandir($dir);
    $folders = array();
    foreach ($files as $file) {
        if (is_dir($dir . '/' . $file) && $file != '.' && $file != '..') {
            $folders[] = $file;
        }
    }

// filer out the folders that do not have a .sitch.js file inside of the same name as the folder
    $sitches = array();
    foreach ($folders as $folder) {
        if (file_exists($dir . '/' . $folder . '/' . $folder . '.sitch.js')) {
            $sitches[$folder] = file_get_contents($dir . '/' . $folder . '/' . $folder . '.sitch.js');
        }
    }
    return $sitches;
}

// if no parapmeters passed then return the sitches as a json object
// return the text-based sitches as a json object
if (count($_GET) == 0) {
    echo json_encode(getSitches());
    exit();
}

// if there's a "get" parameter then it depends on the value of the "get" parameter
// if it's "myfiles", then return a list of the files in the local folder

if (isset($_GET['get'])) {


    if ($_GET['get'] == "myfiles") {
        require('./user.php');

        $userID = getUserID();
        $dir = getUserDir($userID);

        if ($dir == "") {
            echo json_encode(array());
            exit();
        } else {
            $files = scandir($dir);
            $folders = array();
            foreach ($files as $file) {
                if (!is_dir($dir . '/' . $file) && $file != '.' && $file != '..' && $file != '.DS_Store') {
                    $folders[] = $file;
                }
            }
            echo json_encode($folders);
            exit();
        }
    }
}




