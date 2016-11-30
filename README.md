**
mapbbox.js
=============
This node script generates (and optionally downloads) maps through MapBox's static maps API.



 
 
Installation
-----------
1. Clone this repository
2. `cd mapbbox.js`
3. `npm install` 
4. Copy/paste your MapBox access token into the file `mapbox_token`
5. Optionally, replace the contents of mapbox_url_template with a generalized representation of a MapBox static maps API call with your custom mapbox styles.
6. 
To view your default secret access token, create new tokens, or revoke tokens, visit your MapBox [account settings](https://www.mapbox.com/account/apps/) page.


Usage
-----------

```
$ ./mapbbox.js --help 

    Usage: mapbbox [options]

  Options:

    -h, --help                        output usage information
    -V, --version                     output the version number
    -b, --bbox <lon1,lat1,lon2,lat2>  bounding box
    -c, --center <lon1,lat1>          center point <requires zoom>
    -z, --zoom <n>                    map zoom level <requires center>
    -e, --bearing <0-360>             bearing [default = 0]
    -p, --pitch <0-60>                pitch [default = 0]
    -h, --height <n>                  <required> image height in px
    -w, --width <n>                   <required> image width in px
    -o, --output [path]               [optional] output png with optional path
    -g, --georeference <kml|txt>      [optional] output web mercator image bounds to txt or kml <requires output>
    -q, --quiet                       [optional] do not print output path (only works with -o/--output)
```

Example
-----------

```
$ ./mapbbox.js -h 480 -w 640 -b -74.259094,40.477398,-73.700165,40.91758

https://api.mapbox.com/v4/mapbox.emerald/-73.9796295,40.697489000000004,10/640x480.png?access_token=<my access token>

$ ./mapbbox.js -c -99.985007,37.191870 -z 3 -w 600 -h 480 -o USA.png
USA.png

$ open USA.png
```
![alt USA image output](http://furlender.com/img/USA.png "USA image output")

To do something with the image immediately, without having to run a separate command (such as the `open` command above), pipe the output to `xargs`: 

`$ ./mapbbox.js -h 480 -w 640 -b -74.259094,40.477398,-73.700165,40.91758 -o NYC.png | xargs open`
**