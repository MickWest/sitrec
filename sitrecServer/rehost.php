<?php
// need to modify php.ini?
// /opt/homebrew/etc/php/8.2/php.ini
// brew services restart php
require('./user.php');
$user_id = getUserID();

// if we were passed the parameter "getuser", then we just return the user_id
if (isset($_GET['getuser'])) {
    echo $user_id;
    exit();
}

$userDir = getUserDir($user_id);

// need to be logged in, and a memmber of group 9 (Verified users)
if ($user_id == 0 /*|| !in_array(9,$user->secondary_group_ids)*/) {
    http_response_code(501);
    exit("Internal Server Error");
}

if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
    // for local testing
    $storagePath = "http://localhost/sitrec-upload/";
} else {
    // This code is specific to the metabunk.org implementation.
    // if you want to use this code on your own site, you'll need to modify it.
    // or use the local testing code above
    $storagePath = "https://www.metabunk.org/sitrec-upload/";
}

//$logPath = $storageDir . "log.txt";

function writeLog($message) {
//    global $logPath;
//    // Ensure message is a string
//    if (!is_string($message)) {
//        $message = print_r($message, true);
//    }
//
//    // Add a timestamp to each log entry for easier tracking
//    $timestamp = date("Y-m-d H:i:s");
//    $logEntry = "[$timestamp] " . $message . "\n";
//
//    // Append the log entry to the log file
//    file_put_contents($logPath, $logEntry, FILE_APPEND);
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