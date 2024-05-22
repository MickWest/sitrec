<?php
// need to modify php.ini?
// /opt/homebrew/etc/php/8.2/php.ini
// brew services restart php
require('./user.php');

// S3 -------
// WHY IS THIS TIMING OUT TOO EARLY ON MAC
// WHY DOES IT NOT WORK AT ALL ON metabunk.org (Ubuntu)
// Let's set up debuggin in phpstorm

// set_time_limit(10);

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

$isLocal = false;

if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
    // for local testing
    $storagePath = "http://localhost/sitrec-upload/";
    $isLocal = true;
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
$fileName = $_POST['filename'];
$fileContent = file_get_contents($_FILES['fileContent']['tmp_name']);//    require 'vendor/autoload.php';


writeLog(print_r($_FILES, true));
writeLog(print_r($_POST, true));

// Create a filename with MD5 checksum of the contents of the file
$md5Checksum = md5($fileContent);

// Separate the filename and extension
$extension = pathinfo($fileName, PATHINFO_EXTENSION);
$baseName = pathinfo($fileName, PATHINFO_FILENAME);

// Append MD5 checksum before the extension
$newFileName = $baseName . '-' . $md5Checksum . '.' . $extension;


// if there's an aws_credentials.json file, then we'll use that to upload to S3

// Using upload instead of putObject to allow for larger files
// putObject was giving odd timeout errors.
$s3_config_path =  __DIR__ . '/../../sitrec-config/s3-config.php';

if (!$isLocal && file_exists($s3_config_path)) {
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

    $filePath = $_FILES['fileContent']['tmp_name'];  // Path to the temporary uploaded file
    $fileStream = fopen($filePath, 'r');  // Open a file stream

    // Upload the file using the high-level upload method
    try {
        $result = $s3->upload(
            $aws['bucket'],
            $user_id . '/' . $newFileName,
            $fileStream,
            $aws['acl']  // Access control list (e.g., 'public-read')
        );

        // Success, print the URL of the uploaded file
        echo $result['ObjectURL'];
    } catch (Aws\Exception\S3Exception $e) {
        // Catch an S3 specific exception.
        http_response_code(555);
        exit("Internal Server Error: " . $e->getMessage());
    } finally {
        if (is_resource($fileStream)) {
            fclose($fileStream);  // Close the file stream to free up resources
        }
    }
    exit (0);
}



// No AWS credentials, so we'll just upload to the local server

// Check if file exists, if not, write the file
$userFilePath = $userDir . $newFileName;


if (!file_exists($userFilePath)) {

    // Create a directory for the user if it doesn't exist
    if (!file_exists($userDir)) {
        mkdir($userDir, 0777, true);
    }

    move_uploaded_file($_FILES['fileContent']['tmp_name'], $userFilePath);
}

// Return the URL of the rehosted file
echo $storagePath . $user_id. '/' . $newFileName;
?>