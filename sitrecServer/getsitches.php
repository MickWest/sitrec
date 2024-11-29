<?php

//////////////////////////////////////////////////////
/// TODO: This is duplicated code from rehost.php
/// should be refactored into a common file
/// and not be metabunk specific
$isLocal = false;

if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
    // for local testing
    $storagePath = "https://localhost/sitrec-upload/";
    $isLocal = true;
} else {
    // This code is specific to the metabunk.org implementation.
    // if you want to use this code on your own site, you'll need to modify it.
    // or use the local testing code above
    $storagePath = "https://www.metabunk.org/sitrec-upload/";
}
/////////////////////////////////////////////////////////////////


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
        // return an empty array if the user is not logged in
        echo json_encode(array());
        exit();
    }

    // if there's an aws_credentials.json file, then we'll use that to upload to S3
    $s3_config_path =  __DIR__ . '/../../sitrec-config/s3-config.php';
    $useAWS = file_exists($s3_config_path);

   // $useAWS = false;

    if ($useAWS) {
        require 'vendor/autoload.php';
        require $s3_config_path;

        // Load the credentials from ../../../sitrec-keys/aws_credentials.json
        //$aws = json_decode(file_get_contents($awsCredentials), true);

        $aws = getS3Credentials();

        // Get it into the right format
        $credentials = new Aws\Credentials\Credentials($aws['accessKeyId'], $aws['secretAccessKey']);

        // Create an S3 client
        $s3 = new Aws\S3\S3Client([
            'version' => 'latest',
            'region' => $aws['region'],
            'credentials' => $credentials
        ]);

        // convert the dir to an S3 path
        // dir will be like '../../sitrec-upload/99999998/'
        // we want to convert it to '99999998/'
        $dir = getShortDir($userID);

    }


    // myfiles will return a list of files in the user's root directory
    //

//    wht;at's tigetting? dirs? files'

    if ($_GET['get'] == "myfiles") {


        if (!$useAWS) {
            $files = scandir($dir);
            $folders = array();
            foreach ($files as $file) {
                if (is_dir($dir . '/' . $file) && $file != '.' && $file != '..' && $file != '.DS_Store') {
                    // get the last modified date of the folder
                    $lastModified = filemtime($dir . '/' . $file);
                    $lastDate = date('Y-m-d H:i:s', $lastModified);
                    $folders[] = [$file, $lastDate];
                }
            }
            echo json_encode($folders);
            exit();
        } else {
            // get the list of files in the S3 bucket
            $objects = $s3->getIterator('ListObjects', array(
                "Bucket" => $aws['bucket'],
                "Prefix" => $dir . '/'
            ));
            $folders = array();
            foreach ($objects as $object) {
                $key = $object['Key'];

                // strip off the full dir prefix to get the filename
                // eg. if the dir is 99999998/ then we want to strip off the 99999998/
                // check that it actually starts with this dir, including the slash
                $startText = $dir . '/';
                if (substr($key, 0, strlen($startText)) === $startText) {
                    $key = str_replace($dir .'/' , "", $key);
                }


                if ($key != "") {



                    // if $key is a folder, then add it to the array
                    // we can tell if it's a folder because it will contain a /
                    if (strpos($key, "/") !== false) {
                        // strip off everything from the first / onwards
                        $key = strtok($key, "/");


                        // check if the key is already in the array
                        $found = false;
                        foreach ($folders as $folder) {
                            if ($folder[0] == $key) {
                                $found = true;
                                break;
                            }
                        }


                        // if it does not already exist in the array, then add it
                        if (!$found) {
                            $lastModified = $object['LastModified'];
                            $lastDate = $lastModified->format('Y-m-d H:i:s');
                            $folders[] = [$key, $lastDate];
                        }
                    }
                }


            }
            echo json_encode($folders);
            exit();
        }


    } else {

        if ($_GET['get'] == "versions") {
            $name = $_GET['name'];
            $dir .= "/" . $name;
            $versions = array();
            if (!$useAWS) {
                $files = scandir($dir);
                foreach ($files as $file) {
                    if (is_file($dir . '/' . $file) && $file != '.' && $file != '..' && $file != '.DS_Store') {
                        $url = $storagePath . $userID . '/' . $name. '/' . $file;
                        // add to the array and object that contains the url and the version
                        $versions[] = array('version' => $file, 'url' => $url);
                    }
                }
                echo json_encode($versions);
                exit();
            } else {
                // get the list of files in the S3 bucket

                $objects = $s3->getIterator('ListObjects', array(
                    "Bucket" => $aws['bucket'],
                    "Prefix" => $dir
                ));
                foreach ($objects as $object) {
                    $key = $object['Key'];
                    // we need to strip off the full dir prefix to get the filename (the version)
                    $key = str_replace($dir, "", $key);
                    if ($key != "") {
                        // get the url to the file in the bucket
                        $url = $s3->getObjectUrl($aws['bucket'], $dir . $key);

                        // add to the array and object that contains the url and the version
                        $versions[] = array('version' => $key, 'url' => $url);

                    }
                }
                echo json_encode($versions);
                exit();
            }
        }
    }
}


