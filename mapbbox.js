#!/usr/bin/env node
const fs = require('fs');
const program = require('commander');
let path = require('path');
const geoViewport = require('geo-viewport');
const request = require('request');
require('epipebomb')();


const download = function (uri, filename, callback) {
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function list(str) {
    let vals=str.replace(/\s/g,'').split(',').filter(function (el) {
        return el.length && el == +el;
    });
    return vals;
}
const bbox = [];
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
    .version('0.0.3')
.usage('[options]')
    .option('-b, --bbox <lon1,lat1,lon2,lat2>', 'bounding box', list, [])
    .option('-c, --center <lon1,lat1>', 'center point [requires zoom] ', list, [])
    .option('-z, --zoom <n>', 'map zoom level [requires center]', parseFloat, 3.00)
    .option('-e, --bearing <0-360>', 'bearing [default = 0]', parseFloat, 0.00)
    .option('-p, --pitch <0-60>', 'pitch [default = 0]', parseFloat, 0.00)
    .option('-h, --height <n>', '[required] image height in px', parseFloat, 480)
    .option('-w, --width <n>', '[required] image width in px', parseFloat, 600)
    .option('-o, --output [path]', '[optional] output png with optional path')
    .option('-q, --quiet', '[optional] do not print output path (only works with -o/--output)')
    .parse(process.argv);

program.bbox = spaced_args();
program.output = get_output_path();
const bounds = program.bbox;
const zoom = program.zoom;
const center = program.center;
program.bearing = program.bearing || 0;
program.pitch = program.pitch || 0;
const size = [program.width, program.height];
const vp = bounds.length > 0 ? geoViewport.viewport(bounds, size, 0, 22, 512) : {zoom, center};
console.log('vp: ', vp);
var real_bounds = geoViewport.bounds(vp.center, vp.zoom, size, 256)
console.log('real_bounds',real_bounds);

const mapbox_token = fs.readFileSync(__dirname + '/mapbox_token', 'utf8').trim();
const mapbox_url_template = (fs.readFileSync(__dirname + '/mapbox_url_template', 'utf8') || 'https://api.mapbox.com/v4/mapbox.emerald/<lng>,<lat>,<zoom>/<width>x<height>.png?access_token=<token>').trim();
if (!mapbox_token || !mapbox_token.length){
    process.stdout.write("The file mapbox_token must contain your MapBox API access token.");
    process.exit(1);
}
if (vp.center.length < 2){
    process.stdout.write("You must supply either bounding box (-b) or center and zoom (-c and -z).");
    process.exit(1);
}

const url = mapbox_url_template
            .replace('<token>',mapbox_token)
            .replace('<width>',program.width)
            .replace('<height>',program.height)
            .replace('<zoom>',vp.zoom)
            .replace('<bearing>', program.bearing)
            .replace('<pitch>', program.pitch)
            .replace('<lat>',vp.center[1])
            .replace('<lng>',vp.center[0]);

console.log(url);
if (!program.output) {
    process.stdout.write(url);
} else {
    let filename;
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
