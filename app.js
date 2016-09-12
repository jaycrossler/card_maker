var express = require('express'),
    request = require('request'),
    //_ = require('underscore'),
    jsonfile = require('jsonfile'),
    fs = require('fs'),
    fabric = require('fabric').fabric,
    Canvas = require('canvas');

var app = express();
var card_width = 825,
    card_height = 1125,
    card_count = 81, //81,
    thumbnail_scale = 0.2,
    border_1 = 30, border_1_round = 20,
    sheet_url = "https://spreadsheets.google.com/feeds/list/1r2bJjGhoaIfm8iEfsCHKiu3oSOznx5H2HFhwnWwYfjs/od6/public/values?alt=json",
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


function show_thumbnails() {

    var image_w = card_width * thumbnail_scale;
    var image_h = card_height * thumbnail_scale;
    html = '';

    html += '<html><head><title>Limits Of Virtue Cards</title>';
    html += '<style>.card {border:1px solid lightblue; margin:4px;width:'+image_w+'px;height:'+image_h+'px;}</style>';
    html += '</head><body>';
    html += '<h1>Limits Of Virtue Cards</h1>';
    for (var card_id=0; card_id<card_count; card_id++) {
        html += '<a href="/card/' + card_id + '"><img src="/card/' + card_id + '" class="card"/></a>';
    }
    html += '</body></html>';

    return html;
}


//=================================================
init();
//=================================================
app.get('/', function (req, res) {
    res.write(show_thumbnails());
    res.end();
});

//=================================================
app.get('/card/:cardId', function (req, res) {
    var canvas = new Canvas(card_width, card_height);

    var card_id = req.params.cardId;

    //Get Card variables
    var cards = card_data.feed.entry;
    var this_card_data = cards[card_id];
    var dice_text = this_card_data['gsx$dice']['$t']; //TODO: Build some exception handling
    var num_text = this_card_data['gsx$result']['$t'];
    var title_text = this_card_data['gsx$text']['$t'];



    //Create the canvas
    var canvas_fabric = fabric.createCanvasForNode(card_width, card_height);
    canvas_fabric.backgroundColor = 'black';
    canvas_fabric.setBackgroundImage(bg_image);



    //Build "border_1" rectangle around the border
    var rect = new fabric.Rect({
        width: card_width - (border_1 * 2)
        , height: card_height - (border_1 * 2)
        , rx: border_1_round
        , ry: border_1_round
        , left: border_1
        , top: border_1
        , fill: 'rgba(0, 0, 0, 0)'
        , strokeWidth: 4
        , stroke: 'yellow' });
    canvas_fabric.add(rect);

    var line_vert_pos = border_1 + 160;
    var underline = new fabric.Line([border_1, line_vert_pos, card_width - border_1, line_vert_pos],{
        strokeWidth: 4
        , stroke: 'yellow' });
    canvas_fabric.add(underline);

    var text = new fabric.Text(title_text, {
        left: 100
        , top: 70
        , fill: 'yellow'
        , textAlign: 'center'
        , fontSize: (title_text.length > 20 ? 68 : 80)
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text);
    canvas_fabric.centerObjectH(text);


    //TODO: Make these a function and have pos/fontsize differ by content
    var height_mod = -10;
    var diamond_1 = new fabric.Rect({
        left: card_width /2,
        top: (card_height /2) - 205 + height_mod,
        fill: 'yellow',
        width: 200,
        height: 200,
        angle:45,
        opacity: 0.9 });
    canvas_fabric.add(diamond_1);
    var text_1 = new fabric.Text(dice_text[0], {
        left: (card_width /2) - 52 + (dice_text[0] == "-" ? 24 : 0)
        , top: (card_height /2) - 160 + height_mod
        , fill: (dice_text[0] == "-") ? "red" : "black"
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text_1);


    var diamond_2 = new fabric.Rect({
        left: (card_width /2) - 145,
        top: (card_height /2) - 60 + height_mod,
        fill: 'yellow',
        width: 200,
        height: 200,
        angle:45,
        opacity: 0.9 });
    canvas_fabric.add(diamond_2);
    var text_2 = new fabric.Text(dice_text[1], {
        left: (card_width /2) - 196 + (dice_text[1] == "-" ? 24 : 0)
        , top: (card_height /2) - 19 + height_mod
        , fill: (dice_text[1] == "-") ? "red" : "black"
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text_2);


    var diamond_3 = new fabric.Rect({
        left: (card_width /2) + 145,
        top: (card_height /2) - 60 + height_mod,
        fill: 'yellow',
        width: 200,
        height: 200,
        angle:45,
        opacity: 0.9 });
    canvas_fabric.add(diamond_3);
    var text_3 = new fabric.Text(dice_text[2], {
        left: (card_width /2) + 94 + (dice_text[2] == "-" ? 24 : 0)
        , top: (card_height /2) - 19 + height_mod
        , fill: (dice_text[2] == "-") ? "red" : "black"
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text_3);


    var diamond_4 = new fabric.Rect({
        left: card_width /2,
        top: (card_height /2) + 85 + height_mod,
        fill: 'yellow',
        width: 200,
        height: 200,
        angle:45,
        opacity: 0.9 });
    canvas_fabric.add(diamond_4);
    var text_4 = new fabric.Text(dice_text[3], {
        left: (card_width /2) - 52 + (dice_text[3] == "-" ? 24 : 0)
        , top: (card_height /2) + 130 + height_mod
        , fill: (dice_text[3] == "-") ? "red" : "black"
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text_4);


    var rect_small = new fabric.Rect({
        width: 200
        , height: 300
        , left: card_width - 200 - border_1
        , top: card_height - 300 - border_1
        , rx: border_1_round
        , ry: border_1_round
        , strokeWidth: 4
        , stroke: 'yellow' });
    canvas_fabric.add(rect_small);
    var text_total = new fabric.Text(num_text, {
        left: card_width - border_1 - (num_text < 0 ? 180 : 150)
        , top: card_height - border_1 - 250
        , fill: (num_text < 0) ? "red" : "yellow"
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: 'Impact'
    });
    canvas_fabric.add(text_total);


    //Export as PNG
    var stream = canvas_fabric.createPNGStream();
    res.setHeader('Content-Type', 'image/png');
    stream.pipe(res);

    //TODO: Save PNG to directory
});

//=================================================
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
