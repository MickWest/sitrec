<?php

if($mapbox_token_env_var = getenv('MAPBOX_TOKEN')) {
    $token = "?access_token=" . $mapbox_token_env_var;
}

$cache_base_path = "../cache/";

?>