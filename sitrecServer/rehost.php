<?php


// need to modify php.ini?
// /opt/homebrew/etc/php/8.2/php.ini
// brew services restart php

// Directory to store rehosted files
$storageDir = '../../sitrec-upload/';

if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
// for local testing
//    echo "Running on localhost";
    $user_id = 99999999;
    $storagePath = "http://localhost/sitrec-upload/";
} else {
//    echo "Not running on localhost";
    $fileDir = '../../';  # relative path from this script to the Xenforo root
    require($fileDir . '/src/XF.php');
    XF::start($fileDir);
    $app = XF::setupApp('XF\Pub\App');
    $app->start();
    //print_r (XF::visitor());  # dumps entire object
    //print("<br>");
    $user=XF::visitor();
    //print ($user->user_id."<br>"); # = 1 (0 if nobody logged in

    // need to be logged in, and a memmber of group 9 (Verified users)
    if ($user->user_id == 0 /*|| !in_array(9,$user->secondary_group_ids)*/) {
        http_response_code(501);
        exit("Internal Server Error");
    }
    $storagePath = "https://www.metabunk.org/sitrec-upload/";
    $user_id = $user->user_id;
}

$logPath = $storageDir . "log.txt";

function writeLog($message) {
    global $logPath;
    // Ensure message is a string
    if (!is_string($message)) {
        $message = print_r($message, true);
    }

    // Add a timestamp to each log entry for easier tracking
    $timestamp = date("Y-m-d H:i:s");
    $logEntry = "[$timestamp] " . $message . "\n";

    // Append the log entry to the log file
    file_put_contents($logPath, $logEntry, FILE_APPEND);
}

// Check if file and filename are provided
if (!isset($_FILES['fileContent']) || !isset($_POST['filename'])) {
    die("File or filename not provided");
}

// Retrieve the file and filename
$fileContent = file_get_contents($_FILES['fileContent']['tmp_name']);
$fileName = $_POST['filename'];

writeLog(print_r($_FILES, true));
writeLog(print_r($_POST, true));

// Create a directory for the user if it doesn't exist
$userDir = $storageDir . $user_id . '/';
if (!file_exists($userDir)) {
    mkdir($userDir, 0777, true);
}

// Create a filename with MD5 checksum
$md5Checksum = md5($fileContent);

// Separate the filename and extension
$extension = pathinfo($fileName, PATHINFO_EXTENSION);
$baseName = pathinfo($fileName, PATHINFO_FILENAME);

// Append MD5 checksum before the extension
$newFileName = $baseName . '-' . $md5Checksum . '.' . $extension;


// Check if file exists, if not, write the file
$userFilePath = $userDir . $newFileName;
if (!file_exists($userFilePath)) {
    move_uploaded_file($_FILES['fileContent']['tmp_name'], $userFilePath);
}

// Return the URL of the rehosted file
echo $storagePath . $user_id. '/' . $newFileName;
?>