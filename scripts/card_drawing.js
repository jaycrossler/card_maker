var fabric = require('fabric').fabric
    , settings = require('./settings')
    , _ = require('underscore')
    , _s = require("underscore.string")
    , fs = require('fs')
    , PDF = require("pdfkit");


var big_card_width = 825,
    big_card_height = 1125,

    small_card_width = 600,
    small_card_height = 825,

    card_count = 81, //81,
    thumbnail_scale = 0.2;


function show_thumbnails(options) {

    //If options.all, show all cards, otherwise only every 9th
    var skip_count = (options && options.all) ? 1 : 10;
    var style = parseInt(options.style.id) || 1;

    var html = '', card_id, url;

    var image_w_big = big_card_width * thumbnail_scale;
    var image_h_big = big_card_height * thumbnail_scale;
    var image_w_small = small_card_width * thumbnail_scale;
    var image_h_small = small_card_height * thumbnail_scale;

    html += '<style>';
    html += '.card_big {border:1px solid lightblue; margin:4px;width:' + image_w_big + 'px;height:' + image_h_big + 'px;}';
    html += '.card_small {border:1px solid lightblue; margin:4px;width:' + image_w_small + 'px;height:' + image_h_small + 'px;}</style>';
    for (card_id = 0; card_id < card_count; card_id += skip_count) {
        url = '/card/big/' + style + '/' + Math.floor(card_id);
        html += '<a href="' + url + '"><img class="card_big" src="' + url + '"/></a>';
    }
    html += "<br/>";
    for (card_id = 0; card_id < card_count; card_id += skip_count) {
        url = '/card/small/' + style + '/' + Math.floor(card_id);
        html += '<a href="' + url + '"><img class="card_small" src="' + url + '"/></a>';
    }

    return html;
}

function card_renderer_manager(options) {
    options = options || {};
    options.style = _.extend({}, settings.default_card_style, options.style);


    var card_width, card_height;
    if (options.size == 'small') {
        card_width = small_card_width;
        card_height = small_card_height;
    } else {
        // Big
        card_width = big_card_width;
        card_height = big_card_height;
    }

    //Create the canvas
    var canvas_fabric = fabric.createCanvasForNode(card_width, card_height);
    canvas_fabric.backgroundColor = options.style.bg_color || "black";

    //Manage adding all layers
    var layers = (options.size == 'big') ? options.style.layers_big : options.style.layers_small;
    _.each(layers, function(layer){
        var layer_extended = extend_layer_from_defaults(layer);
        if (layer_extended.renderer == 'Background Image') {
            canvas_fabric.setBackgroundImage(settings.image_cached_by_src(layer_extended.src));
        } else {
            _.each(build_card_pieces_from_layer(layer_extended, options), function(image_layer){
               canvas_fabric.add(image_layer);
            });
        }
    });

    return canvas_fabric.createPNGStream();
}

function extend_layer_from_defaults(layer) {
    var layer_defaults = _.find(settings.layer_defaults, function (layer_d){return layer_d.renderer == layer.renderer });
    if (layer_defaults && layer_defaults.renderer) {
        layer = _.extend({}, layer_defaults, layer);
    } else {
        console.log ("Couldn't find layer settings for layer " + layer.renderer);
    }
    return layer;
}

//--------------------------------
function build_card_pieces_from_layer(layer, options) {

    var renderer = _s.titleize(layer.renderer);
    var pieces = [];

    var card_width, card_height, border_outside_buffer;

    if (options.size == 'small') {
        // Small
        card_width = small_card_width;
        card_height = small_card_height;
    } else {
        // Big
        card_width = big_card_width;
        card_height = big_card_height;
    }
    layer.padding = layer.padding || .03;
    border_outside_buffer = (card_width * layer.padding);

    console.log('='+renderer);

    if (renderer == 'Background Image') {
        //---------------------------------------
        //Should have already been handled
    } else if (renderer == 'Border') {
        //---------------------------------------
        var rect = draw_border_rect({
            w: card_width,
            h: card_height,
            b: border_outside_buffer,
            br: (card_width * layer.rounded),
            color: value_parser(layer, 'color', options),
            lw: 4
        });
        pieces.push(rect);
    } else if (renderer == 'Card Top Title') {
        //---------------------------------------
        var text = value_parser(layer, 'value', options);
        var title_text_size = parseInt(card_width * layer.size);
        if (text.length > 17) {
            title_text_size = title_text_size * .9;
        }
        if (text.length > 20) {
            title_text_size = title_text_size * .9;
        }

        var text_item = new fabric.Text(text, {
            left: (card_width / 2)
            , top: (card_height * layer.top)
            , fill: value_parser(layer, 'color', options)
            , textAlign: 'center'
            , fontSize: title_text_size
            , originX: 'center', originY: 'bottom'
            , fontWeight: 'bold'
            , fontFamily: layer.font
        });
        pieces.push(text_item);

    } else if (renderer == 'Horizontal Line') {
        //---------------------------------------
        var line_vert_pos = (card_width * (layer.padding + layer.top));
        var underline = new fabric.Line([border_outside_buffer, line_vert_pos, card_width - border_outside_buffer, line_vert_pos], {
            strokeWidth: (card_width * layer.width)
            , stroke: value_parser(layer, 'color', options)
        });
        pieces.push(underline);
    } else if (renderer == 'Number Diamonds') {
        //---------------------------------------
        //TODO: For some reason, the diamonds is making everything dark. Fix this
        pieces = draw_diamonds(options, card_width, card_height, (card_height * layer.top), layer);
    } else if (renderer == 'Number In Box') {
        //---------------------------------------
        var tile_width, tile_height, tile_top, tile_left;
        tile_width = tile_height = parseInt(card_width * layer.scale);
        tile_top = (card_height * layer.top);
        tile_left = (card_width * layer.left);

        var rect_small = new fabric.Rect({
            width: tile_width
            , height: tile_height
            , left: tile_left
            , top: tile_top
            , originX: 'center', originY: 'center'
            , rx: (card_width * layer.rounded)
            , ry: (card_width * layer.rounded)
            , strokeWidth: 4
            , stroke: value_parser(layer, 'color', options)
        });
        pieces.push(rect_small);

        var num_text = value_parser(layer, 'value', options);
        if (num_text >= 0) num_text = "+" + num_text;
        var text_total = new fabric.Text(num_text, {
            left: tile_left + (layer.text_left * card_width)
            , top: tile_top + (layer.text_top * card_height)
            , fill: (num_text < 0) ? value_parser(layer, 'negative_color', options) : value_parser(layer, 'color', options)
            , originX: 'center', originY: 'center'
            , fontSize: (tile_width * .8)
            , fontWeight: 'bold'
            , fontFamily: value_parser(layer, 'font', options)
        });
        pieces.push(text_total);


    } else if (renderer == 'Paragraph') {
        //---------------------------------------
        var story =  value_parser(layer, 'value', options);
        var text_story = new fabric.Textbox(story, {
            left: (card_width * layer.left)
            , top: (card_height * layer.top)
            , originX: 'center', originY: 'bottom'
            , fontSize: (card_width * layer.scale)
            , height: (card_height * layer.box_height)
            , textAlign: 'center'
            , width: card_width - (border_outside_buffer * 2) - 40
            , fontWeight: 'bold'
            //, stroke: 'black'
            , fill: value_parser(layer, 'main_color', options)
            , fontFamily: value_parser(layer, 'font', options)

        });
        pieces.push(text_story);
    } else if (renderer == 'Text List') {
        //---------------------------------------
        var list_text = "";
        if (layer.title) list_text += layer.title + "\n";
        var items = value_parser(layer, 'values', options);
        if (layer.unique) {
            items = _.uniq(items);
        }
        _.each(items, function(item){
            list_text += item + "\n";
        });

        var text_list_items = new fabric.Textbox(list_text, {
            left: (card_width * layer.left)
            , top: (card_height * layer.top)
            , originX: 'center', originY: 'top'
            , fontSize: (card_width * layer.scale)
            , height: (card_height * layer.box_height)
            , textAlign: 'center'
            , width: card_width - (border_outside_buffer * 2) - 40
            , fontWeight: 'bold'
            , fill: value_parser(layer, 'color', options)
            , fontFamily: value_parser(layer, 'font', options)
        });
        pieces.push(text_list_items);
    }
    return pieces;
}

function value_parser(layer, field, options) {
    var result = "";

    var lookup_val = layer[field];
    if (!lookup_val) {
        lookup_val = '{{' + field + '}}';
    }

    if (lookup_val.indexOf("{")>-1 && lookup_val.indexOf("}")>-1) {
        if (lookup_val == '{{main_color}}') {
            result = options.style.main_color;
        } else if (lookup_val == '{{positive_color}}') {
            result = options.style.positive_color;
        } else if (lookup_val == '{{negative_color}}') {
            result = options.style.negative_color;
        } else if (lookup_val == '{{second_color}}') {
            result = options.style.second_color;
        } else if (lookup_val == '{{title}}') {
            result = options.title_text;
        } else if (lookup_val == '{{value}}') {
            result = options.num_text;
        } else if (lookup_val == '{{keywords}}') {
            result = options.keywords;
        } else if (lookup_val == '{{dice}}') {
            result = options.dice_text;
        } else if (lookup_val == '{{description}}') {
            result = options.story_text;
        } else if (lookup_val == '{{font}}') {
            result = options.font || 'Impact';
        }
    } else {
        result = lookup_val;
    }

    console.log("Lookup of " + field + " for " + lookup_val + " was " + result);
    return result;
}

//--------------------------------
// function draw_card(options) {
//
//     options = options || {};
//     options.style = _.extend({}, settings.default_card_style, options.style);
//
//     var card_width, card_height, border_outside_buffer, border_outside_buffer_round,
//         height_mod, title_size_from_top, show_text_on_bottom;
//
//     if (options.size == 'small') {
//         // Small
//         card_width = small_card_width;
//         card_height = small_card_height;
//         border_outside_buffer = small_border_outside_buffer;
//         border_outside_buffer_round = small_border_outside_buffer_round;
//         height_mod = 0;
//         title_size_from_top = 40;
//         show_text_on_bottom = false;
//     } else {
//         // Big
//         card_width = big_card_width;
//         card_height = big_card_height;
//         border_outside_buffer = big_border_outside_buffer;
//         border_outside_buffer_round = big_border_outside_buffer_round;
//         height_mod = -35;
//         title_size_from_top = 70;
//         show_text_on_bottom = true;
//     }
//
//     //Create the canvas
//     var canvas_fabric = fabric.createCanvasForNode(card_width, card_height);
//     canvas_fabric.backgroundColor = options.style.bg_color || "black";
//     canvas_fabric.setBackgroundImage(options.bg_image);
//
//     var rect;
//     if (options.style.layout == "central" || options.style.layout == "stacked") {
//         rect = draw_border_rect({
//             w: card_width,
//             h: card_height,
//             b: border_outside_buffer,
//             br: border_outside_buffer_round,
//             color: options.style.main_color,
//             lw: 4
//         });
//         canvas_fabric.add(rect);
//     }
//
//     var line_vert_pos = border_outside_buffer + 160;
//     var underline = new fabric.Line([border_outside_buffer, line_vert_pos, card_width - border_outside_buffer, line_vert_pos], {
//         strokeWidth: 4
//         , stroke: options.style.main_color
//     });
//     canvas_fabric.add(underline);
//
//     var title_text_size = parseInt(card_width * .1);
//     if (options.title_text.length > 17) {
//         title_text_size = title_text_size * .9;
//     }
//     if (options.title_text.length > 20) {
//         title_text_size = title_text_size * .9;
//     }
//
//     var text = new fabric.Text(options.title_text, {
//         left: 100
//         , top: title_size_from_top
//         , fill: options.style.main_color
//         , textAlign: 'center'
//         , fontSize: title_text_size
//         , fontWeight: 'bold'
//         , fontFamily: options.style.font
//     });
//     canvas_fabric.add(text);
//     canvas_fabric.centerObjectH(text);
//
//     if (options.style.dice_display == 'diamonds') {
//         var items = draw_diamonds(options, card_width, card_height, height_mod);
//         _.each(items, function (item) {
//             canvas_fabric.add(item);
//         })
//     }
//
//     //--------------------------------------------
//     //Small tile of total score in bottom right
//     var tile_width, tile_height, tile_top, tile_top_text, tile_left, tile_left_text;
//     tile_width = tile_height = parseInt(card_width * .15);
//     var height_buffer = parseInt(card_height * .15);
//
//     var total_position = options.style.total;
//     if (options.size == 'small' && options.style.total_small) {
//         total_position = options.style.total_small;
//     }
//
//     if (total_position == 'top middle') {
//         tile_top = tile_height + border_outside_buffer + 20;
//         tile_left = ((card_width - tile_width) / 2);
//         tile_top_text = (tile_width * .4) + border_outside_buffer + height_buffer;
//         tile_left_text = tile_left + (tile_width / 2);
//     } else if (total_position == 'bottom right') {
//         tile_top = card_height - (tile_height + border_outside_buffer + 20);
//         tile_left = card_width - (tile_width * 2);
//         tile_top_text = tile_top + (tile_width * .4);
//         tile_left_text = tile_left + (tile_width / 2);
//     } else if (total_position == 'center middle') {
//         tile_top = ((card_height - tile_width) / 2);
//         tile_left = ((card_width - tile_width) / 2);
//         tile_top_text = tile_top + (tile_width * .4);
//         tile_left_text = tile_left + (tile_width / 2);
//     }
//
//     var rect_small = new fabric.Rect({
//         width: tile_width
//         , height: tile_height
//         , left: tile_left
//         , top: tile_top
//         , rx: border_outside_buffer_round
//         , ry: border_outside_buffer_round
//         , strokeWidth: 4
//         , stroke: options.style.main_color
//     });
//     canvas_fabric.add(rect_small);
//
//     if (options.num_text >= 0) options.num_text = "+" + options.num_text;
//     var text_total = new fabric.Text(options.num_text, {
//         left: tile_left_text
//         , top: tile_top_text
//         , fill: (options.num_text < 0) ? options.style.negative_color : options.style.main_color
//         , originX: 'center', originY: 'center'
//         , fontSize: (tile_width * .8)
//         , fontWeight: 'bold'
//         , fontFamily: options.style.font
//     });
//     canvas_fabric.add(text_total);
//
//     //--------------------------------------------
//     if (show_text_on_bottom) {
//         var text_story = new fabric.Textbox(options.story_text, {
//             left: ((card_width) / 2)
//             , top: card_height - border_outside_buffer - 30
//             , originX: 'center', originY: 'bottom'
//             , fontSize: 28
//             , height: 200
//             , textAlign: 'center'
//             , width: card_width - (border_outside_buffer * 2) - 40
//             , fontWeight: 'bold'
//             //, stroke: 'black'
//             , fill: options.style.main_color
//             , fontFamily: options.style.font
//
//         });
//         canvas_fabric.add(text_story);
//     }
//
//     return canvas_fabric.createPNGStream();
//
// }

//-------------------------------------------
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

//-------------------------------------------
function draw_diamonds(options, card_width, card_height, height_mod, layer) {
    var canvas_items = [];

    //TODO: Change all height and width and sizes to be dynamic
    var main_color = value_parser(layer, 'main_color', options);
    var second_color = value_parser(layer, 'second_color', options);
    var positive_color = value_parser(layer, 'positive_color', options);
    var negative_color = value_parser(layer, 'negative_color', options);

    var diamond_1 = new fabric.Rect({
        left: card_width / 2,
        top: (card_height / 2) - 205 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    var text_1 = new fabric.Text(options.dice_text[0], {
        left: (card_width / 2) - 52 + (options.dice_text[0] == "-" ? 24 : 0)
        , top: (card_height / 2) - 160 + height_mod
        , fill: (options.dice_text[0] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_1 = new fabric.Text(options.keywords[0], {
        left: (card_width / 2) - 180
        , top: (card_height / 2) - 90 + height_mod
        , originX: 'center', originY: 'center'
        , angle: -45
        , fill: second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_items.push(diamond_1);
    canvas_items.push(text_1);
    canvas_items.push(keyword_1);

    var diamond_2 = new fabric.Rect({
        left: (card_width / 2) - 145,
        top: (card_height / 2) - 60 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    var text_2 = new fabric.Text(options.dice_text[1], {
        left: (card_width / 2) - 196 + (options.dice_text[1] == "-" ? 24 : 0)
        , top: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[1] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_2 = new fabric.Text(options.keywords[1], {
        left: (card_width / 2) + 180
        , top: (card_height / 2) - 90 + height_mod
        , angle: 45
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_items.push(diamond_2);
    canvas_items.push(text_2);
    canvas_items.push(keyword_2);

    var diamond_3 = new fabric.Rect({
        left: (card_width / 2) + 145,
        top: (card_height / 2) - 60 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    var text_3 = new fabric.Text(options.dice_text[2], {
        left: (card_width / 2) + 94 + (options.dice_text[2] == "-" ? 24 : 0)
        , top: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[2] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_3 = new fabric.Text(options.keywords[2], {
        left: (card_width / 2) + 170
        , top: (card_height / 2) + 260 + height_mod
        , angle: 135
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_items.push(diamond_3);
    canvas_items.push(text_3);
    canvas_items.push(keyword_3);

    var diamond_4 = new fabric.Rect({
        left: card_width / 2,
        top: (card_height / 2) + 85 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        angle: 45,
        opacity: 0.9
    });
    var text_4 = new fabric.Text(options.dice_text[3], {
        left: (card_width / 2) - 52 + (options.dice_text[3] == "-" ? 24 : 0)
        , top: (card_height / 2) + 130 + height_mod
        , fill: (options.dice_text[3] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: 200
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_4 = new fabric.Text(options.keywords[3], {
        left: (card_width / 2) - 170
        , top: (card_height / 2) + 260 + height_mod
        , angle: 225
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: 80
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    canvas_items.push(diamond_4);
    canvas_items.push(text_4);
    canvas_items.push(keyword_4);

    return canvas_items;
}

function pdf_renderer_piper(options, res){
    var doc = new PDF({
        size: 'LEGAL', // See other page sizes here: https://github.com/devongovett/pdfkit/blob/d95b826475dd325fb29ef007a9c1bf7a527e9808/lib/page.coffee#L69

        info: {
            Title: 'TSOYD Cards, Style ' + options.style,
            Author: 'Paul Vencill and Jay Crossler'
        }
    });
    var filename ='./images/pdfs/cards_' + options.style + '_'+ options.size + '.pdf';
    doc.pipe(
        fs.createWriteStream(filename)
    ).on('finish', function () {
        console.log('Wrote PDF file ' + filename);

        fs.readFile(filename, function (err, data) {
            // if (err) throw err;
            // console.log(file_name + ' found in local file cache, sent from file');

            res.writeHead(200, {'Content-Type': 'application/pdf'});
            res.end(data);
        });
    });
    //--------------------------
    var width_pixels = 804;

    var num_x = 4;
    var num_y = 5;

    var aspect =  big_card_width / big_card_height;

    var height = Math.floor(width_pixels / num_x);
    var width = Math.floor(aspect * height);
    var page_break = (num_y * num_x);

    for(var i=0; i<81; i++) {
        var url = "./images/cards/card_big_" + options.style + '_' + i + '.png';
        var x = (width * (i % num_x));
        var y = (height * Math.floor((i % page_break) / num_x));

        doc.image(url, x, y, {fit: [width, height]})
            .stroke();

        if ((i % page_break) == (page_break-1)) {
            doc.addPage();
            console.log("Adding page after image " + i + ", pagebreak " + page_break);
        }

    }

    // doc.text('Hello World');
    //
    // doc.addPage()
    //     .fontSize(25)
    //     .text('Here is some vector graphics...', 100, 100);
    //
    // doc.save()
    //     .moveTo(100, 150)
    //     .lineTo(100, 250)
    //     .lineTo(200, 250)
    //     .fill("#FF3300");

    doc.end();
}



//======================================
module.exports = {
    show_thumbnails: show_thumbnails,
    card_renderer_manager: card_renderer_manager,
    pdf_renderer_piper: pdf_renderer_piper
};