<?php

//    print_r($_COOKIE);

    $fileDir = '../../';  # relative path from this script to the Xenforo root
    require($fileDir . '/src/XF.php');
    XF::start($fileDir);
    $app = XF::setupApp('XF\Pub\App');
    $app->start();
    print_r (XF::visitor());  # dumps entire object
//    print("<br>");
    $user=XF::visitor();
//    print ($user->user_id."<br>"); # = 1 (0 if nobody logged in)

 //   if (in_array(18,$user->secondary_group_ids))
 //       print ("Group 18<br>");

    print($user->username."<br>");

    exit(0);