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
//    $sitches = array();
//    foreach ($folders as $folder) {
//        // Normalize the folder name to lowercase for comparison
//        $normalizedFolderName = strtolower($folder);
//        $folderPath = $dir . '/' . $folder;
//
//        // Check if the folder path is actually a directory
//        if (is_dir($folderPath)) {
//            // Scan the directory for files
//            $filesInFolder = scandir($folderPath);
//
//            // Normalize file names to lowercase for case-insensitive comparison
//            $normalizedFiles = array_map('strtolower', $filesInFolder);
//
//            // Construct the expected file name based on the folder name
//            $expectedFileName = $normalizedFolderName . '.sitch.js';
//
//            // Check if the normalized file names array contains the expected file name
//            if (in_array($expectedFileName, $normalizedFiles)) {
//                // Find the original file name by matching the normalized name
//                foreach ($filesInFolder as $file) {
//                    if (strtolower($file) === $expectedFileName) {
//                        // Read the content of the file when the case-insensitive match is found
//                        $sitches[$folder] = file_get_contents($folderPath . '/' . $file);
//                        break; // Stop the loop after finding the matching file
//                    }
//                }
//            }
//        }
//    }

    // new naming convention is Sitname.js
    // eg. for 29palms is Sit29palms.js
    // so filter out the folders that do not have a .js file inside of the same name as the folder (with Sit prefix)
    $sitches = array();
    foreach ($folders as $folder) {
        // Normalize the folder name to lowercase for comparison
        $normalizedFolderName = strtolower($folder);
        $folderPath = $dir . '/' . $folder;

        // Check if the folder path is actually a directory
        if (is_dir($folderPath)) {
            // Scan the directory for files
            $filesInFolder = scandir($folderPath);

            // Normalize file names to lowercase for case-insensitive comparison
            $normalizedFiles = array_map('strtolower', $filesInFolder);

            // Construct the expected file name based on the folder name
            // also in lower case, for comparision
            $expectedFileName = 'sit' . $normalizedFolderName . '.js';

            // Check if the normalized file names array contains the expected file name
            if (in_array($expectedFileName, $normalizedFiles)) {
                // Find the original file name by matching the normalized name
                foreach ($filesInFolder as $file) {
                    if (strtolower($file) === $expectedFileName) {
                        // Read the content of the file when the case-insensitive match is found
                        $sitches[$folder] = file_get_contents($folderPath . '/' . $file);
                        break; // Stop the loop after finding the matching file
                    }
                }
            }
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
    require('./user.php');

    $userID = getUserID();
    $dir = getUserDir($userID);

    if ($dir == "") {
        echo json_encode(array());
        exit();
    }


    if ($_GET['get'] == "myfiles") {

        $files = scandir($dir);
        $folders = array();
        foreach ($files as $file) {
            if (is_dir($dir . '/' . $file) && $file != '.' && $file != '..' && $file != '.DS_Store') {
                $folders[] = $file;
            }
        }
        echo json_encode($folders);
        exit();

    } else {
        if ($_GET['get'] == "versions") {
            $name = $_GET['name'];
            $dir .= "/" . $name;
            $versions = array();
            $files = scandir($dir);
            foreach ($files as $file) {
                if (is_file($dir . '/' . $file) && $file != '.' && $file != '..' && $file != '.DS_Store') {
                    $versions[] = $file;
                }
            }
            echo json_encode($versions);
            exit();

        }
    }
}


