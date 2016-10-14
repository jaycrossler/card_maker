var express = require('express')
    , request = require('request')
    , jsonfile = require('jsonfile')
    , _ = require('underscore')
    , fs = require('fs')
    , settings = require('./scripts/settings')
    , card_drawing = require('./scripts/card_drawing')
    , card_images_directory = __dirname + '/images/cards/';


var app = express();
var sheet_url = "https://spreadsheets.google.com/feeds/list/1r2bJjGhoaIfm8iEfsCHKiu3oSOznx5H2HFhwnWwYfjs/od6/public/values?alt=json",
    card_data = null,
    cache_file = '/tmp/card_data_from_sheets.json';

//Initialize the program on startup
function init() {

    //Preload all images into memory
    settings.preload_images();

    //Load data file
    fs.readFile(cache_file, 'utf8', function (err, data) {
        if (err) {
            //console.error(err);

            //Load from Google Sheets
            request({
                url: sheet_url,
                json: true
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log('gSheets url returned data');

                    jsonfile.writeFile(cache_file, body, function (err) {
                        console.error(err);
                    });
                    console.log('Settings data from gSheets written to file');

                    card_data = body;
                }
            });

        } else {
            console.log('Settings data from gSheets parsed in from saved file');
            card_data = JSON.parse(data);
        }
    });

    //Load list of cached images
    fs.readdir(card_images_directory, function (err, data) {
        settings.image_file_list = data;
        console.log(data.length + ' images already in system');
    });

}
//=================================================
init();
//=================================================



//=================================================
// Routes
//=================================================
app.get('/', function (req, res) {
    //TODO: Have a way to show alternate titles
    //TODO: Pull real keywords instead of random ones
    //TODO: Pull real flavor text instead of random ones
    //TODO: Have a database of styles
    //TODO: Allow user to design their own style
    //TODO: Decide if style should be an int or a guid

    var h = "<html><head><title>TSOYD</title></head><body>";
    h += '<style>body {background-color: lightblue; font-family: Verdana, Arial, serif}</style>';
    h += "<h1>What is The Size of your Deck?!</h1>";

    _.each(settings.card_styles, function (style) {
        h += "<h2>" + style.name + "</h2>";
        h += "[<a href='/cards/" + style.id + "/images/big'>Big Deck (images)</a>] ";
        h += "[<a href='/cards/" + style.id + "/images/small'>Small Deck (images)</a>] ";
        h += "[<a href='/pdf/" + style.id + "/images/big'>Big Deck (pdfs)</a>] ";
        h += "[<a href='/pdf/" + style.id + "/images/small'>Small Deck (pdfs)</a>] ";
        h += "[<a href='/delete-images/style/" + style.id + "'>REBUILD ALL CACHED IMAGES</a>]<br/>";
        h += card_drawing.show_thumbnails({size: 'big', all: false, style: style});
    });

    h += "<li><a href='/flush'>Reload card data from Google Sheets</a></li>";
    h += "<li><a href='/delete-images'>Delete all locally saved card images</a></li>";
    h += "</body></html>";

    res.write(h);
    res.end();
});

app.get('/cards/:style/images/:size', function (req, res) {
    var options = {size: req.params.size, all: true, style: req.params.style};
    res.write(card_drawing.show_thumbnails(options));
    res.end();
});

app.get('/pdf/:style/images/:size', function (req, res) {
    var options = {size: req.params.size, all: true, style: req.params.style};
    card_drawing.pdf_renderer_piper(options, res);
});

//Re-load all data
app.get('/flush', function (req, res) {
    init();
    res.redirect("/");
});

//Delete all images in the system
app.get('/delete-images', function (req, res) {
    _.each(settings.image_file_list, function (file) {

        fs.unlink(card_images_directory + file, function (err) {
            if (err) return console.log(err);
            console.log('File ' + file + ' deleted successfully');
        });

    });

    init();
    res.redirect("/");
});

//Delete all images in the system from a particular style
app.get('/delete-images/style/:style_id', function (req, res) {
    var style_id = req.params.style_id;

    _.each(settings.image_file_list, function (file) {
        var file_style = file.split('_')[2];
        if (file_style == style_id) {
            fs.unlink(card_images_directory + file, function (err) {
                if (err) return console.log(err);
                console.log('File ' + file + ' deleted successfully');
            });
        }
    });

    init();
    res.redirect("/");
});


//=================================================
app.get('/card/:size/:style/:id', function (req, res) {
    //var canvas = new Canvas(card_width, card_height);

    var id = req.params.id || 0;
    var size = (req.params.size == 'big') ? 'big' : 'small';
    var style_id = parseInt(req.params.style);

    var flush = req.query.flush; // Add ?flush to url to rebuild the image

    //Don't regenerate cards if already exist - pull from saved
    var file_name = card_file_name(size, style_id, id, false);
    var image_on_disk = _.indexOf(settings.image_file_list, file_name) > -1;

    if (image_on_disk && !flush) {
        //Image file exists already, return cached file
        fs.readFile(card_file_name(size, style_id, id, true), function (err, data) {
            // if (err) throw err;
            // console.log(file_name + ' found in local file cache, sent from file');

            res.writeHead(200, {'Content-Type': 'image/png'});
            res.end(data);
        });
    } else {
        //No image, generate it
        var style = _.find(settings.card_styles, function (style) {
            return style.id == style_id
        });
        var stream = get_data_and_draw_card({id: id, size: size, style: style});
        console.log(file_name + ' not found in local file cache - generating');

        res.setHeader('Content-Type', 'image/png');
        stream.pipe(res);
    }

});

//=================================================

function get_data_and_draw_card(options) {

    var size = (options && options.size == 'big') ? 'big' : 'small';
    var id = (options && options.id) || 1;

    //Get Card variables
    card_data.feed = card_data.feed || {};
    card_data.feed.entry = card_data.feed.entry || [];
    var cards = card_data.feed.entry;
    var this_card_data = cards[id];
    var dice_text = this_card_data['gsx$dice']['$t']; //TODO: Build some exception handling
    var num_text = this_card_data['gsx$result']['$t'];
    var title_text = this_card_data['gsx$text']['$t'];
    var story_text = settings.samples.flavor_text;
    var keywords = settings.rand_keywords_from_seed(id);

    //Lookup the style detail
    var style = settings.style_data_from_id(options.style.id);

    //Build the content to use to generate the card image
    var card_options = {
        style: style,
        size: size,
        bg_image: [options.style.bg_image],
        card_id: id,
        this_card_data: this_card_data,
        dice_text: dice_text,
        num_text: num_text,
        title_text: title_text,
        story_text: story_text,
        keywords: keywords
    };

    //Construct the card's image
//    var stream = card_drawing.draw_card(card_options);
    var stream = card_drawing.card_renderer_manager(card_options);

    //Save PNG to directory of cards
    var path = card_file_name(size, options.style.id, id, true);
    var out = fs.createWriteStream(path);
    stream.on('data', function (chunk) {
        out.write(chunk);
    });
    //Add to the cache list that a new one was created
    settings.image_file_list.push(card_file_name(size, options.style.id, options.id, false));

    //Export as PNG to browser
    return stream;
}

//=================================================
app.listen(3000, function () {
    console.log('Card Builder app listening on port 3000');
});

//--------------------------------
//Utility Functions


function card_file_name(size, style, id, with_dir) {
    var url = with_dir ? card_images_directory : '';
    return url + 'card_' + size + '_' + style + '_' + id + '.png';
}