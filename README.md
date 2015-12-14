
mapbbox.js
=============
This node script generates (and optionally downloads) maps through MapBox's static maps API.



 
 
Installation
-----------
1. Clone this repository
2. `cd mapbbox`
3. `npm install` 
4. Copy/paste your MapBox access token into the file `mapbox_token`

To view your default secret access token, create new tokens, or revoke tokens, visit your MapBox [account settings](https://www.mapbox.com/account/apps/) page.


Usage
-----------

```
$ ./mapbbox.js --help 

  Usage: mapbbox [options]

  Options:

    -h, --help                        output usage information
    -V, --version                     output the version number
    -b, --bbox <lon1,lat1,lon2,lat2>  [required] bounding box
    -h, --height <n>                  [required] image height in px
    -w, --width <n>                   [required] image width in px
    -o, --output [path]               [optional] output png with optional path
    -q, --quiet                       [optional] do not print output path (only works with -o/--output)
```

Example
-----------

```
$ ./mapbbox.js -h 480 -w 640 -b -74.259094,40.477398,-73.700165,40.91758

https://api.mapbox.com/v4/mapbox.emerald/-73.9796295,40.697489000000004,10/640x480.png?access_token=<my access token>

$ ./mapbbox.js -h 480 -w 640 -b -74.259094,40.477398,-73.700165,40.91758 -o NYC.png
NYC.png

$ open NYC.png
```
![alt NYC image output](http://furlender.com/img/NYC.png "NYC image output")

To do something with the image immediately, without having to run a separate command (such as the `open` command above), pipe the output to `xargs`: 

`$ ./mapbbox.js -h 480 -w 640 -b -74.259094,40.477398,-73.700165,40.91758 -o NYC.png | xargs open`
