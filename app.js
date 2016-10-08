var express = require('express')
    , request = require('request')
    , jsonfile = require('jsonfile')
    , _ = require('underscore')
    , fs = require('fs')
    , card_drawing = require('./scripts/card_drawing')
    , fabric = require('fabric').fabric;

var card_styles = [
    {id: 1, name: 'Aeon'},
    {id: 2, name: 'Garden of Musk'},
    {id: 3, name: 'Swords and Suckers'},
    {id: 4, name: 'Ye Olde Horror Shacke'},
    {id: 5, name: 'Build your own decks!'}
];



var app = express();
var sheet_url = "https://spreadsheets.google.com/feeds/list/1r2bJjGhoaIfm8iEfsCHKiu3oSOznx5H2HFhwnWwYfjs/od6/public/values?alt=json",
    card_data = null,
    bg_image = null,
    bg_src = 'images/blue_hex_bg.png',
    cache_file = '/tmp/card_data_from_sheets.json';

function init(){

    //TODO: Load multiple background images
    fabric.util.loadImage(bg_src, function(img) {
        bg_image = new fabric.Image(img);

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
                        console.log('url returned data');

                        jsonfile.writeFile(cache_file, body, function (err) {
                            console.error(err);
                        });
                        console.log('written to file');

                        card_data = body;
                    }
                });

            } else {
                console.log('data parsed in from file');
                card_data = JSON.parse(data);
            }
        });

    });

}




//=================================================
init();
//=================================================
app.get('/', function (req, res) {
    //TODO: Have a way to show alternate titles
    //TODO: Pull real keywords instead of random ones
    //TODO: Pull real flavor text instead of random ones
    //TODO: Have a database of styles
    //TODO: Allow user to design their own style
    //TODO: Decide if style should be an int or a guid


    var h = "<html><head><title>The Size of Your Deck</title></head><body>";
    h += '<style>body {background-color: lightblue;font-family: Verdana}</style>';
    h += "<h1>The Size of your Deck!</h1>";

    _.each(card_styles, function(style){
        h += "<h2>" + style.name + "</h2>";
        h += "[<a href='/cards/" + style.id + "/images/big'>Big Deck (images)</a>] ";
        h += "[<a href='/cards/" + style.id + "/images/small'>Small Deck (images)</a>] ";
        h += "[<a href='/cards/" + style.id + "/pdf/big'>Big Deck (pdfs)</a>] ";
        h += "[<a href='/cards/" + style.id + "/pdf/small'>Small Deck (pdfs)</a>]<br/>";
        h += card_drawing.show_thumbnails({size:'big',all:false, style:style});
    });

    h += "<li><a href='/flush'>Reload card data from Google Sheets</a></li>";
    h += "</body></html>";

    res.write(h);
    res.end();
});


app.get('/cards/:style/images/:size', function (req, res) {
    res.write(card_drawing.show_thumbnails({size:req.params.size, all:true, style:req.params.style}));
    res.end();
});

app.get('/pdf/:style/images/:size', function (req, res) {
    res.write(card_drawing.show_thumbnails({size:req.params.size, all:true, style:req.params.style}));
    res.end();
});


//Re-load all data
app.get('/flush', function (req, res) {
    init();
    res.redirect("/");
});


//=================================================
app.get('/card/:size/:style/:id', function (req, res) {
    //var canvas = new Canvas(card_width, card_height);

    var id = req.params.id;
    var size = (req.params.size == 'big') ? 'big' : 'small';
    var style = parseInt(req.params.style);

    var stream = get_data_and_draw_card(id, size, style, true);

    res.setHeader('Content-Type', 'image/png');
    stream.pipe(res);

    //TODO: Don't regenerate cards if already exist - pull from saved
});

function get_data_and_draw_card (card_id, card_size, card_style, save_to_disk) {

    var size = (card_size == 'big') ? 'big' : 'small';
    var style = parseInt(card_style);

    //Get Card variables
    var cards = card_data.feed.entry;
    var this_card_data = cards[card_id];
    var dice_text = this_card_data['gsx$dice']['$t']; //TODO: Build some exception handling
    var num_text = this_card_data['gsx$result']['$t'];
    var title_text = this_card_data['gsx$text']['$t'];
    var story_text = "1LT Dewberry was a helicopter pilot - well liked, intelligent and popular with the ladies.  Unfortunately, none of those traits discouraged the incomming MANPAD rocket.";

    rand_seed = card_id;
    var items = 'Artillery Scouts Stealth Airpower Cyber Logistics Leader Weather Terrain Tunnel Sabotage Charge Fuel Morale'.split(' ');
    var keyword_1 = items[Math.floor(random()*items.length)];
    var keyword_2 = items[Math.floor(random()*items.length)];
    var keyword_3 = items[Math.floor(random()*items.length)];
    var keyword_4 = items[Math.floor(random()*items.length)];
    if (random() < .4) {
        keyword_4 = keyword_2;

        if (random() < .4) {
            keyword_3 = keyword_1;

            if (random() < .4) {
                keyword_2 = keyword_1;
                keyword_4 = keyword_1;
            }
        }
    }

    var options = {
        style : style,
        size: size,
        bg_image : bg_image,
        card_id: card_id,
        this_card_data: this_card_data,
        dice_text : dice_text,
        num_text : num_text,
        title_text : title_text,
        story_text : story_text,
        keywords : [keyword_1, keyword_2, keyword_3, keyword_4]
    };


    //Construct the card's image
    var stream = card_drawing.draw_card(options);

    if (save_to_disk) {
        //Save PNG to directory of cards
        var path = __dirname + '/images/cards/card_' + size + '_' + style + '_' + card_id + '.png';
        var out = fs.createWriteStream(path);
        stream.on('data', function(chunk) {
            out.write(chunk);
        });
    }

    //Export as PNG to browser
    return stream;
}

//=================================================
app.listen(3000, function () {
    console.log('Card Builder app listening on port 3000');
});


//--------------------------------
//Utility Functions

//Temporary Randomness function
var rand_seed = 1;
function random() {
    var x = Math.sin(rand_seed++) * 10000;
    return x - Math.floor(x);
}