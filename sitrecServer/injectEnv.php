<?php
// Specify the path to your configuration file
$filename = '../shared.env.php'; // Change this to your file's name if necessary

// Check if the file exists
if (!file_exists($filename)) {
    die("Error: File '$filename' not found.\n");
}

// Read the file line by line, ignoring empty lines
$lines = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

foreach ($lines as $line) {
    // Trim whitespace from the beginning and end of the line
    $line = trim($line);

    // Skip the line if it's a comment or empty after trimming
    if ($line === '' || $line[0] === '#') {
        continue;
    }

    // Split the line into key and value on the first '=' found
    $parts = explode('=', $line, 2);
    if (count($parts) != 2) {
        // not a line with a single '=', so skip it
        // this will skip the <?php tag and the php /* .... */ multi-line comment
        // that is automatically added to the shared.env file by webpackCopyPatterns.js

        // Optionally log or handle malformed lines here
        continue;
    }

    $key = trim($parts[0]);
    $value = trim($parts[1]);

    // Remove wrapping quotes (either single or double) if they exist
    if (strlen($value) >= 2 &&
       (($value[0] === '"' && $value[strlen($value) - 1] === '"') ||
        ($value[0] === "'" && $value[strlen($value) - 1] === "'"))) {
        $value = substr($value, 1, -1);
    } else {
        // check for boolean values
        if (strtolower($value) === 'true') {
            $value = true;
        } elseif (strtolower($value) === 'false') {
            $value = false;
        } elseif (is_numeric($value)) {
            // check for numeric values, including integers and floats
            $value = $value + 0;
        }
    }

    // Inject the environment variable
    putenv("$key=$value");
    // Optionally, also set it in $_ENV and $_SERVER for broader availability
//    $_ENV[$key] = $value;
//    $_SERVER[$key] = $value;
}
?>
