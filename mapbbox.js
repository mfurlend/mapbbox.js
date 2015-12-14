#!/usr/bin/env node
var fs = require('fs');
var program = require('commander');
var path = require('path');
var geoViewport = require('geo-viewport');
var request = require('request');
require('epipebomb')();


var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function list(str) {
    vals=str.replace(/\s/g,'').split(',');
    vals= vals.filter(function(el) {return el.length && el==+el; });
    return vals;
}
var bbox = [];
function spaced_args(){
    if (program.bbox.length === 4){
        return program.bbox.map(function(el){
            return parseFloat(el);
        });
    }
    if (program.bbox.length > 4){
        process.stdout.write('Too many arguments!');
        process.exit();
    }
    var additional = program.args.map(function(el){
        if (el && el.length){
           el = el.replace(/[\s,]/g,'');
           return (el.length && el==+el) ? parseFloat(el) : false;
        }
    }).filter(function(el){
        return el !== false;
    });
    return program.bbox.concat(additional);
}

function get_output_path(){
    if (!program.output){
        return false;
    }
    else if (program.output === true){
        path = './output';
    } else {
         path = program.output;
    }
    if (path.indexOf('/') > -1 || path.indexOf("\\") > -1){
        if (!fs.existsSync(path)){
            fs.mkdirSync(path,0755);
        }
    }
    return path;
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

program
.version('0.0.1')
.usage('[options]')
.option('-b, --bbox <lon1,lat1,lon2,lat2>', 'a bounding box', list, [])
.option('-h, --height <n>', 'image height in px', parseFloat)
.option('-w, --width <n>', 'image width in px', parseFloat)
.option('-o, --output [path]', 'output png with optional path')
.option('-q, --quiet', 'do not print output path (only works with -o/--output)')
.parse(process.argv);

program.bbox = spaced_args();
program.output = get_output_path();
bounds = program.bbox;
size = [program.width, program.height];
var vp = geoViewport.viewport(bounds, size);
var mapbox_token = fs.readFileSync(__dirname +'/mapbox_token', 'utf8');
if (!mapbox_token || !mapbox_token.length){
    process.stdout.write("The file mapbox_token must contain your MapBox API access token.");
}
var mapbox_url_template = 'https://api.mapbox.com/v4/mapbox.emerald/<lng>,<lat>,<zoom>/<width>x<height>.png?access_token=<token>';
var url = mapbox_url_template
            .replace('<token>',mapbox_token)
            .replace('<width>',program.width)
            .replace('<height>',program.height)
            .replace('<zoom>',vp.zoom)
            .replace('<lat>',vp.center[1])
            .replace('<lng>',vp.center[0]);

if (!program.output) {
    process.stdout.write(url);
} else {
    var filename;
    if (endsWith(program.output,".png")){
         filename = program.output;
    }
    else {
        filename = program.output + '/' + size.join('x') + program.bbox.join(',') + '.png';
    }
    download(url, filename, function(arg){
        if (!program.quiet){
            process.stdout.write(filename);
        }
    });
}
