<?php

// find all the sitches in the sitrec/data folder and return them as a json object
// a sitchs is a folder with a file inside it with the same name with a .sitch.js extension
// The file contains a text description of the sitch in javascript object notation

// get the list of folders in the data folder
$dir = "../data";
$files = scandir($dir);
$folders = array();
foreach($files as $file) {
    if(is_dir($dir . '/' . $file) && $file != '.' && $file != '..') {
        $folders[] = $file;
    }
}

// filer out the folders that do not have a .sitch.js file inside of the same name as the folder
$sitches = array();
foreach($folders as $folder) {
    if(file_exists($dir . '/' . $folder . '/' . $folder . '.sitch.js')) {
        $sitches[$folder] = file_get_contents($dir . '/' . $folder . '/' . $folder . '.sitch.js');
    }
}

// return the text-based sitches as a json object
echo json_encode($sitches);



