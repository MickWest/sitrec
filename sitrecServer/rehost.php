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


// if there's an aws_credentials.json file, then we'll use that to upload to S3
// AWS IS DISABLED FOR NOW - TIMEOUT ISSUES
if (0 && file_exists('../../../sitrec-keys/aws_credentials.json')) {
    require 'vendor/autoload.php';

    // load the credentials from ../../../sitrec-keys/aws_credentials.json
    $aws = json_decode(file_get_contents('../../../sitrec-keys/aws_credentials.json'), true);

    // get it into the right format
    $credentials = new Aws\Credentials\Credentials($aws['accessKeyId'], $aws['secretAccessKey']);

    // Upload to S3
    $s3 = new Aws\S3\S3Client([
        'version' => 'latest',
        'region' => $aws['region'],
        'credentials' => $credentials
    ]);

    // Upload a file.
    $result = $s3->putObject([
        'Bucket' => $aws['bucket'],
        'Key' => $user_id . '/' . $newFileName,
        'Body' => $fileContent,
        'ACL' => $aws['acl']
    ]);


    // check for errors and return the status code if something went wrong
    if ($result['@metadata']['statusCode'] != 200) {
        http_response_code($result['@metadata']['statusCode']);
        exit("Internal Server Error");
    }

    // Success, so print the URL of the uploaded file
    echo $result['ObjectURL'];
    exit (0);
}

// No AWS credentials, so we'll just upload to the local server

// Check if file exists, if not, write the file
$userFilePath = $userDir . $newFileName;
if (!file_exists($userFilePath)) {
    move_uploaded_file($_FILES['fileContent']['tmp_name'], $userFilePath);
}

// Return the URL of the rehosted file
echo $storagePath . $user_id. '/' . $newFileName;
?>