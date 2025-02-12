# Rehosting files in Sitrec

## Introduction

In Sitrec two type of files are rehosted

1. *Dynamic Links* - Specifically links to satellite TLE data. Current data is rehosted so it does not go out of date. Eventually historical data will also be rehosted to avoid having to rely on an external data source
2. *User files* - The user can drag-and-drop file, or open a local sitch folder, or manually uploaded a file for rehosting

Sitrec has a JavaScript client (95% of the code) and a PHP backend. The Metabunk implementation also makes some use of the Xenforo forum software for user authentication. 

## How the Client uploads

Uploading is initiated from the client via a CRehoster object in CRehoster.js, this encapsulates a call to rehost.php on the server and handles returning the response

```javascript
            let formData = new FormData();
            formData.append('fileContent', new Blob([data]));
            formData.append('filename', filename);

            const serverURL = SITREC_SERVER +'rehost.php'

            let response = await fetch(serverURL, {
                method: 'POST',
                body: formData  // Send FormData with file and filename
            });
```

This is called via FileManager.rehoster.rehostFile, which returns a promise
```javascript
    rehostFile(filename, data) {
        var promise = this.rehostFilePromise(filename, data)
        this.rehostPromises.push(promise);
        return promise;
    }
```

You can use the promise returned by the function FileManager.rehoster.waitForAllRehosts() to ensure it has all been uploaded. 

Currently, error handling is minimal.


The uploading to the server is done with a simple POST, and so it is limited by two variables:
 - **client_max_body_size** in the Nginx .conf file (or Apache equivalent)
 - **upload_max_filesize** in php.ini (e.g in /etc/php/8.3/fpm/phi.ini)

In the Metabunk implementation, these are both set to 100M

## Server Rehosting Configuration

The server can be configured to either rehost to the server's filesystem or to an S3 bucket. Both methods will return a URL that resolves to the file. 


### User authentication and User Upload Folders

To upload a file, the user must be authenticated. This is done by a function that returns a user ID. The ID can be a number, or a string. This ID is used as the name of the user's upload folder. Each user can only upload to their own folder, so determination of the ID is entirely server-side. 

A custom authentication method can be implemented with a function getUserIDCustom() in config.php, which returns a user ID, or 0 if not logged in. For example, this is the Metabunk authenticator. 
```javascript
function getUserIDCustom()
{
    // a default user id for testing
    // and for if there's no xenforo
    $user_id = 99999999;

    if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost') {
        // for local testing
    } else {
        $fileDir = getenv('XENFORO_PATH');
        if ($fileDir) {
            // check if the file exists
            $xf_file = $fileDir . 'src/XF.php';
            if (file_exists($xf_file)) {
                require($xf_file);
                XF::start($fileDir);
                $app = XF::setupApp('XF\Pub\App');
                $app->start();
                $user = XF::visitor();
                $user_id = $user->user_id;
            }
        }
    }
    return $user_id;
}
```
Note I return 99999999 if we are running a on local host, this is just for testing. If deployed then it used the Xenforo forum framework (i.e. the software that runs Metabunk.org) to get the i.d. of the user (assuming they are logged in). It returns 0 if not logged in, and that will disable file rehosting. 

Supplying a getUserIDCustom() is required in config.php, but you can just return any value as the default user id. Return 0 means they are not logged in. If you don't have rehosting of files available, then return 0

### Filesystem Rehosting

Filesystem rehosting is the default and has no additional configuration. The uploaded file is stored in the sitrec-upload/<UserID> folder which needs to be writable)

### AWS S3 Rehosting

S3 requires the AWS PHP SDK installed. This can be installed using Composer, which means you have to install composer, e.g.
```shell
apt-get install composer
```

Then in the sitrecServer folder, where you should have a **composer.json** and a **composer.lock** file, run 
```shell
composer update
```
This will install the AWS SDK in a folder called vendor. 

Configuring the AWS S3 connection is done with a set of credentials. These are set in config/shared.env, for example:

```php
SAVE_TO_S3=true
S3_ACCESS_KEY_ID="Aasd...6D6"
S3_SECRET_ACCESS_KEY="GRF...sKyX"
S3_REGION="us-west-2"
S3_BUCKET="sitrec"
S3_ACL="public-read"
}
```
if you don't supply these credentials file then the server will just attempt to use the filesystem rehosting.

See shared.env for additional configuration.
