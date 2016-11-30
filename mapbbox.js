#!/usr/bin/env node
const compile = require("string-template/compile"),
    formatKML = compile(`
    <?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
     <GroundOverlay>
       <name></name>
       <Icon>
         <href>{image}</href>
       </Icon>
       <SRS>EPSG:3857</SRS>
       <LatLonBox>
         <west>{west}</west>
         <east>{east}</east>
         <south>{south}</south>
         <north>{north}</north>
         <rotation>{rotation}</rotation>
       </LatLonBox>
     </GroundOverlay>
    </kml>`),
    formatTXT = compile(`{west} {east} {south} {north}`),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    program = require('commander'),
    geoViewport = require('geo-viewport'),
    request = require('request'),
    path = require('path');
require('epipebomb')();

const degrees2meters = (lon, lat) => {
    if (lon.length === 2) {
        [lon, lat] = [lon[0], lon[1]];
    }
    let x = lon * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return [x, y]
};

const download = (uri, filename, callback) =>{
    request.head(uri, (err, res, body) =>{
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

const collectGeoreference = (val, memo) =>{
    const lval = val.toLowerCase();
    const regexp = /^(kml|txt)$/;
    const match = regexp.exec(lval);
    if (!match) {
        console.warn("Invalid argument supplied for option -g (--georeference). Using \"-g kml\" instead.\n")
    }
    memo.push(match && match.length === 2 ? match[1] : 'kml');
    return memo.filter((elem, pos) => memo.indexOf(elem) == pos);
};

const list = str => str.replace(/\s/g, '').split(',').filter(el => el.length && el == +el);
const bbox = [];
const spaced_args = () =>{
    if (program.bbox.length === 4) {
        return program.bbox.map(el => parseFloat(el));
    }
    if (program.bbox.length > 4) {
        process.stdout.write('Too many arguments!');
        process.exit();
    }
    const additional = program.args.map(el =>{
        if (el && el.length) {
            el = el.replace(/[\s,]/g, '');
            return (el.length && el == +el) ? parseFloat(el) : false;
        }
    }).filter(el => el !== false);
    return program.bbox.concat(additional);
};

const make_parent_directories = output_path =>{
    let dirname = path.resolve(path.normalize(output_path.endsWith('.png') ? path.dirname(output_path) : output_path));
    if (!fs.existsSync(dirname)) {
        mkdirp.sync(dirname,parseInt('7777', 8));
    }
};
const get_output_path = (output_path, size, bbox) => {
    if (!output_path) {
        return false;
    }
    if (output_path === true) {
        output_path = './output';
    }
    else if (!path.isAbsolute(output_path) && !output_path.startsWith('./')) {
        output_path = './' + output_path;
    }

    return output_path.endsWith('.png') ? output_path : output_path + '/' + size.join('x') + bbox.join(',') + '.png';
};


program
    .version('0.0.4')
    .usage('[options]')
    .option('-b, --bbox <lon1,lat1,lon2,lat2>', 'bounding box', list, [])
    .option('-c, --center <lon1,lat1>', 'center point <requires zoom> ', list, [])
    .option('-z, --zoom <n>', 'map zoom level <requires center>', parseFloat, 3.00)
    .option('-e, --bearing <0-360>', 'bearing [default = 0]', parseFloat, 0.00)
    .option('-p, --pitch <0-60>', 'pitch [default = 0]', parseFloat, 0.00)
    .option('-h, --height <n>', '<required> image height in px', parseFloat, 480)
    .option('-w, --width <n>', '<required> image width in px', parseFloat, 600)
    .option('-o, --output [path]', '[optional] output png with optional path')
    .option('-g, --georeference <kml|txt>', '[optional] output web mercator image bounds to txt or kml <requires output>', collectGeoreference, [])
    .option('-q, --quiet', '[optional] do not print output path (only works with -o/--output)')
    .parse(process.argv);

if (!process.argv.slice(2).length) {
    program.help();
}

program.bbox = spaced_args();
const bounds = program.bbox;
const zoom = program.zoom;
const center = program.center;
program.bearing = program.bearing || 0;
program.pitch = program.pitch || 0;
const size = [program.width, program.height];
program.output = get_output_path(program.output, size, program.bbox);
make_parent_directories(program.output);

const vp = bounds.length > 0 ? geoViewport.viewport(bounds, size, 0, 22, 512) : {zoom, center};
let real_bounds = geoViewport.bounds(vp.center, vp.zoom, size, 512);


const mercator = {
    ul: degrees2meters([real_bounds[0], real_bounds[3]]), //ul: [west,north]
    lr: degrees2meters([real_bounds[2], real_bounds[1]]), //lr: [east,south]
    rotation: 0
};
[mercator.west, mercator.north, mercator.east, mercator.south] = mercator.ul.concat(mercator.lr);
mercator.image = path.basename(path.relative(process.cwd(), program.output));

const mapbox_token = fs.readFileSync(__dirname + '/mapbox_token', 'utf8').trim();
const mapbox_url_template = (
    fs.readFileSync(__dirname + '/mapbox_url_template', 'utf8') ||
    'https://api.mapbox.com/v4/mapbox.emerald/<lng>,<lat>,<zoom>/<width>x<height>.png?access_token=<token>'
).trim();

if (!mapbox_token || !mapbox_token.length) {
    process.stdout.write("The file mapbox_token must contain your MapBox API access token.");
    process.exit(1);
}
if (vp.center.length < 2) {
    process.stdout.write("You must supply either bounding box (-b) or center and zoom (-c and -z).");
    process.exit(1);
}

const url = mapbox_url_template
    .replace('<token>', mapbox_token)
    .replace('<width>', program.width)
    .replace('<height>', program.height)
    .replace('<zoom>', vp.zoom)
    .replace('<bearing>', program.bearing)
    .replace('<pitch>', program.pitch)
    .replace('<lat>', vp.center[1])
    .replace('<lng>', vp.center[0]);

if (!program.output) {
    process.stdout.write(url);
} else {
    download(url, program.output, arg =>{
        if (!program.quiet) {
            process.stdout.write(program.output);
        }
    });
}

const get_txt_output = mercator => {
    "use strict";
    return formatTXT(mercator).trim();
};

const get_kml_output = mercator => {
    "use strict";
    return formatKML(mercator).trim();
};
const write_file = (image_output_path, data, format) =>{
    let parsed_path = path.parse(image_output_path);
    let filename = parsed_path.name+'.'+format;
    let output_path = [parsed_path.dir,filename].join('/');
    fs.writeFile(output_path, data, ['utf8']);
};

for (let format of program.georeference){
    let bounds_output = '';
    switch (format){
        case 'txt':
            bounds_output = get_txt_output(mercator);
            break;
        case 'kml':
        default:
            bounds_output = get_kml_output(mercator);
            break;
    }
    if (program.output && bounds_output !== ''){
        write_file(program.output, bounds_output, format);
    }
}
