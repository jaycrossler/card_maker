var fabric = require('fabric').fabric,
    _ = require('underscore');

module.exports = {
    show_thumbnails: show_thumbnails,
    draw_card: draw_card
};

//TODO: Have different sizes for big/small cards
var big_card_width = 825,
    big_card_height = 1125,
    big_border_outside_buffer = 30, big_border_outside_buffer_round = 20,

    small_card_width = 600,
    small_card_height = 825,
    small_border_outside_buffer = 10, small_border_outside_buffer_round = 0,

    card_count = 81, //81,
    thumbnail_scale = 0.2;

var default_card_style = {
    bg_image: 0, bg_color: 'black',
    main_color: 'yellow', second_color: 'white', font: 'Impact',
    negative_color: 'red', positive_color: 'black',
    layout: 'central', dice_display: 'diamonds', total: 'top middle'
};

//TODO: Extract drawing into separate functions and build a DSL

function show_thumbnails(options) {

    //If options.all, show all cards, otherwise only every 9th
    var skip_count = (options && options.all) ? 1 : 10;
    var style = parseInt(options.style.id) || 1;

    var html = '', card_id, url;

    var image_w_big = big_card_width * thumbnail_scale;
    var image_h_big = big_card_height * thumbnail_scale;
    var image_w_small = small_card_width * thumbnail_scale;
    var image_h_small = small_card_height * thumbnail_scale;


    html += '<style>.card_big {border:1px solid lightblue; margin:4px;width:' + image_w_big + 'px;height:' + image_h_big + 'px;}';
    html += '.card_small {border:1px solid lightblue; margin:4px;width:' + image_w_small + 'px;height:' + image_h_small + 'px;}</style>';
    for (card_id = 0; card_id < card_count; card_id += skip_count) {
        url = '/card/big/' + style + '/' + Math.floor(card_id);
        html += '<a href="' + url + '"><img src="' + url + '" class="card_big"/></a>';
    }
    html += "<br/>";
    for (card_id = 0; card_id < card_count; card_id += skip_count) {
        url = '/card/small/' + style + '/' + Math.floor(card_id);
        html += '<a href="' + url + '"><img src="' + url + '" class="card_small"/></a>';
    }

    return html;
}

function draw_border_rect(options) {

    //Build rounded rectangle around the border
    return new fabric.Rect({
        width: options.w - (options.b * 2)
        , height: options.h - (options.b * 2)
        , rx: options.br
        , ry: options.br
        , left: options.b
        , top: options.b
        , fill: 'rgba(0, 0, 0, 0)'
        , strokeWidth: 4
        , stroke: options.color
    });
}

function draw_card(options) {

    options = options || {};
    options.style = _.extend({}, default_card_style, options.style);

    var card_width, card_height, border_outside_buffer, border_outside_buffer_round,height_mod;

    if (options.size == 'small') {
        card_width = small_card_width;
        card_height = small_card_height;
        border_outside_buffer = big_border_outside_buffer;
        border_outside_buffer_round = big_border_outside_buffer_round;
        height_mod = 0;
    } else {
        card_width = big_card_width;
        card_height = big_card_height;
        border_outside_buffer = small_border_outside_buffer;
        border_outside_buffer_round = small_border_outside_buffer_round;
        height_mod = -35;
    }
    
    
    //Create the canvas
    var canvas_fabric = fabric.createCanvasForNode(card_width, card_height);
    canvas_fabric.backgroundColor = options.style.bg_color || "black";
    canvas_fabric.setBackgroundImage(options.bg_image);

    var rect;
    if (options.style.layout == "central" || options.style.layout == "stacked") {
        rect = draw_border_rect({
            w: card_width,
            h: card_height,
            b: border_outside_buffer,
            br: border_outside_buffer_round,
            color: options.style.main_color,
            lw: 4
        });
        canvas_fabric.add(rect);
    }

    var line_vert_pos = border_outside_buffer + 160;
    var underline = new fabric.Line([border_outside_buffer, line_vert_pos, card_width - border_outside_buffer, line_vert_pos], {
        strokeWidth: 4
        , stroke: options.style.main_color
    });
    canvas_fabric.add(underline);

    var text = new fabric.Text(options.title_text, {
        left: 100
        , top: 70
        , fill: options.style.main_color
        , textAlign: 'center'
        , fontSize: (options.title_text.length > 20 ? 68 : 80)
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text);
    canvas_fabric.centerObjectH(text);

    //TODO: Make these a function and have pos/font size differ by content
    var diamond_1 = new fabric.Rect({
        left: card_width / 2,
        top: (card_height / 2) - 205 + height_mod,
        fill: options.style.main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    canvas_fabric.add(diamond_1);
    var text_1 = new fabric.Text(options.dice_text[0], {
        left: (card_width / 2) - 52 + (options.dice_text[0] == "-" ? 24 : 0)
        , top: (card_height / 2) - 160 + height_mod
        , fill: (options.dice_text[0] == "-") ? options.style.negative_color : options.style.positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text_1);
    var callout_1 = new fabric.Text(options.keywords[0], {
        left: (card_width / 2) - 180
        , top: (card_height / 2) - 90 + height_mod
        , originX: 'center', originY: 'center'
        , angle: -45
        , fill: options.style.second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(callout_1);

    var diamond_2 = new fabric.Rect({
        left: (card_width / 2) - 145,
        top: (card_height / 2) - 60 + height_mod,
        fill: options.style.main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    canvas_fabric.add(diamond_2);
    var text_2 = new fabric.Text(options.dice_text[1], {
        left: (card_width / 2) - 196 + (options.dice_text[1] == "-" ? 24 : 0)
        , top: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[1] == "-") ? options.style.negative_color : options.style.positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text_2);
    var callout_2 = new fabric.Text(options.keywords[1], {
        left: (card_width / 2) + 180
        , top: (card_height / 2) - 90 + height_mod
        , angle: 45
        , originX: 'center', originY: 'center'
        , fill: options.style.second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(callout_2);

    var diamond_3 = new fabric.Rect({
        left: (card_width / 2) + 145,
        top: (card_height / 2) - 60 + height_mod,
        fill: options.style.main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    canvas_fabric.add(diamond_3);
    var text_3 = new fabric.Text(options.dice_text[2], {
        left: (card_width / 2) + 94 + (options.dice_text[2] == "-" ? 24 : 0)
        , top: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[2] == "-") ? options.style.negative_color : options.style.positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text_3);
    var callout_3 = new fabric.Text(options.keywords[2], {
        left: (card_width / 2) + 170
        , top: (card_height / 2) + 260 + height_mod
        , angle: 135
        , originX: 'center', originY: 'center'
        , fill: options.style.second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(callout_3);

    var diamond_4 = new fabric.Rect({
        left: card_width / 2,
        top: (card_height / 2) + 85 + height_mod,
        fill: options.style.main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    canvas_fabric.add(diamond_4);
    var text_4 = new fabric.Text(options.dice_text[3], {
        left: (card_width / 2) - 52 + (options.dice_text[3] == "-" ? 24 : 0)
        , top: (card_height / 2) + 130 + height_mod
        , fill: (options.dice_text[3] == "-") ? options.style.negative_color : options.style.positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text_4);
    var callout_4 = new fabric.Text(options.keywords[3], {
        left: (card_width / 2) - 170
        , top: (card_height / 2) + 260 + height_mod
        , angle: 225
        , originX: 'center', originY: 'center'
        , fill: options.style.second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(callout_4);

    //Small tile of total score in bottom right
    var tile_width = 120, tile_height = 120;
    var rect_small = new fabric.Rect({
        width: tile_width
        , height: tile_height
        , left: ((card_width - tile_width) / 2)
        , top: tile_width + border_outside_buffer + 20
        , rx: border_outside_buffer_round
        , ry: border_outside_buffer_round
        , strokeWidth: 4
        , stroke: options.style.main_color
    });
    canvas_fabric.add(rect_small);

    if (options.num_text >= 0) options.num_text = "+" + options.num_text;
    var text_total = new fabric.Text(options.num_text, {
        left: ((card_width) / 2)
        , top: (tile_width * .4) + border_outside_buffer + 162
        , fill: (options.num_text < 0) ? options.style.negative_color : options.style.main_color
        , originX: 'center', originY: 'center'
        , fontSize: (tile_width * .8)
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_fabric.add(text_total);

    if (options.size == 'big') {
        var text_story = new fabric.Textbox(options.story_text, {
            left: ((card_width) / 2)
            , top: card_height - border_outside_buffer - 30
            , originX: 'center', originY: 'bottom'
            , fontSize: 28
            , height: 200
            , textAlign: 'center'
            , width: card_width - (border_outside_buffer * 2) - 40
            , fontWeight: 'bold'
            //, stroke: 'black'
            , fill: options.style.main_color
            , fontFamily: options.style.font

        });
        canvas_fabric.add(text_story);
    }

    return canvas_fabric.createPNGStream();

}
