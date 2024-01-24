<?php

    require __DIR__ . '/../../sitrec-config/cachemaps-config.php';

    if(!isset($cache_base_path)) {
        $cache_base_path = "../../sitrec-cache/";
    }

// https://metabunk.org/sitrec/sitrecServer/proxy.php?url=https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle
    $url = $_GET["url"];  // usage e.g.

//    echo "Attempting: ".$url;
    $url = rawurldecode($url);
//    echo "Decoded: ".$url;


    $path_parts = pathinfo($url);
    $ext = strtolower($path_parts['extension']);
    $url_parts = parse_url($url);

    $caching = true;

    // for hosts that don't have an extension, add the right one here.
    if (strcmp($url_parts['host'],"celestrak.org") === 0) {
        $ext = "tle";
    } else {
        exit("Illegal host");
    }


    // check for allowed extensions
//if ($ext !== "jpg" && $ext !== "jpg" && ext !== "png" && ext !=="tiff" )
//    if (!($ext === "jpg" || $ext === "jpg" || ext === "png" || ext ==="tiff") )
    if (strcmp($ext,"tle") !== 0    )
        exit("Illegal File Type ". $ext);

    $hash = md5($url) . "." . $ext;

    $cachePath = $cache_base_path . $hash;
    //$fileLocation = "/srv/www/metabunk.org/public_html/sitrec-cache/";
    $fileLocation = $cache_base_path;

    $cachedFile = $fileLocation . $hash;
    //check if file exists

//    echo (time(). " - " . filemtime($cachedFile) . " = ". time()-filemtime($cachedFile));
//    exit (0);

    ob_start();

    // if cached file exists, and is less than 1 hour old, then return that.
    if ($caching && file_exists($cachedFile) && ((time() - filemtime($cachedFile)) < (60 * 60)) ) {
        echo (time(). " - " . filemtime($cachedFile) . " = ". time()-filemtime($cachedFile));
        echo "cached file exists\n";

        header("Location: " . $cachePath);
        exit();


        //check if file age is within 24 hours
        //
        /*

        if(time() - filemtime($cachedFile) > (24 * 3600)) {
            echo "cache is within 24 hours\n";
            // we now drop thought to the "header" redirect to this cached file
        }
        */
    } else {

//    echo "cache no found<br>";
//    echo "<br>cachedFile: " . $cachedFile;
//    echo "<br>cachedPath: " . $cachePath;

        //cache doesn't exist or is older than 24 hours
        //download it
//        echo "<br>Fetching from host " . $url_parts['host'];
        $extra = "";
        $options = array(
            'http'=>array(
                'method'=>"GET",
                'header'=>"Accept-language: en\r\n" .
                    "Cookie: foo=bar\r\n" .  // check function.stream-context-create on php.net
                    "User-Agent: Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.102011-10-16 20:23:10\r\n" // i.e. An iPad
            )
        );
        $context = stream_context_create($options);

        $dataBlob = file_get_contents($url . $extra, false, $context);
        if ($dataBlob == false || strlen($dataBlob) === 0) {
            echo "<br>FAILED to fetch " . $url . $extra;
            if ($dataBlob == false) echo "<br>file_get_contents returned false";
            else echo "<br>$dataBlob zero size";
            exit();
        }
        echo "<br>Fetched";
        echo "<br>result size = ".strlen($dataBlob);

        if ($caching) {
            // Save content into cache
            $status = file_put_contents($cachedFile, $dataBlob);
            if ($status === false) {
                echo "<br>WRITE FAILED " . $cachedFile;
            }
            echo("<br>Written to Location: " . $cachePath);
        } else {
            header('Content-Type: text/plain');
            echo $dataBlob;
            exit();
        }
        //return downloaded content as result
//    return dataBlob;
    }



    header("Location: " . $cachePath);
    exit();

//}

// http://mickwest.com/wp-content/uploads/2007/01/552.png

