var express = require('express')
    , request = require('request')
    , jsonfile = require('jsonfile')
    , fs = require('fs')
    , card_drawing = require('./scripts/card_drawing')
    , fabric = require('fabric').fabric;

var app = express();
var sheet_url = "https://spreadsheets.google.com/feeds/list/1r2bJjGhoaIfm8iEfsCHKiu3oSOznx5H2HFhwnWwYfjs/od6/public/values?alt=json",
    card_data = null,
    bg_image = null,
    bg_src = 'images/blue_hex_bg.png',
    cache_file = '/tmp/card_data_from_sheets.json';

function init(){

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
    //TODO: Initially show only a few cards, then all
    //TODO: Have a way to show alternate titles
    //TODO: Pull real keywords instead of random ones

    var h = "<html><head><title>The Size of Your Deck!</title></head><body>";
    h += "<h1>The Size of your Deck!</h1>";
    h += "<li><a href='/cards/images/big'>All cards as images (full sized)</a></li>";
    h += "<li><a href='/cards/images/small'>All cards as images (small)</a></li>";
    h += "<li><a href='/cards/pdf/big'>All cards as PDF sheet (small)</a></li>";
    h += "<li><a href='/cards/pdf/small'>All cards as PDF sheet (small)</a></li>";
    h += "<li><a href='/flush'>Reload card data from Google Sheets</a></li>";
    h += "<br/>Here are a few cards:<br/>";
    h += card_drawing.show_thumbnails({size:'small',all:false});
    h += "</body></html>";

    res.write(h);
    res.end();
});


app.get('/cards/images/big', function (req, res) {
    res.write(card_drawing.show_thumbnails({size:'big',all:true}));
    res.end();
});

app.get('/cards/images/small', function (req, res) {
    res.write(card_drawing.show_thumbnails({size:'small',all:true}));
    res.end();
});


//Re-load all data
app.get('/flush', function (req, res) {
    init();
    res.redirect("/");
});


//=================================================
app.get('/card/:cardId', function (req, res) {
    //var canvas = new Canvas(card_width, card_height);

    var card_id = req.params.cardId;

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
        design_style : 'black_hex',
        bg_image : bg_image,
        card_id: card_id,
        this_card_data: this_card_data,
        dice_text : dice_text,
        num_text : num_text,
        title_text : title_text,
        story_text : story_text,
        keywords : [keyword_1, keyword_2, keyword_3, keyword_4]
    };

    //Export as PNG to browser
    var stream = card_drawing.draw_card(options);
    res.setHeader('Content-Type', 'image/png');
    stream.pipe(res);


    //Save PNG to directory of cards
    var path = __dirname + '/images/cards/card_' + card_id + '.png'; //TODO: save based on build
    var out = fs.createWriteStream(path);
    stream.on('data', function(chunk) {
        out.write(chunk);
    });
});

//=================================================
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});


//--------------------------------
//Utility Functions

//Temporary Randomness function
var rand_seed = 1;
function random() {
    var x = Math.sin(rand_seed++) * 10000;
    return x - Math.floor(x);
}