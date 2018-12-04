var settings = require('./settings')
    , _ = require('underscore')
    , _s = require("underscore.string")
    , fs = require('fs')
    , PDF = require("pdfkit")
    , Konva = require('konva-node');


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
    // Returns a Stage of layers

    options = options || {};
    options.style = _.extend({}, settings.default_card_style, options.style);


    //Determine card sizes
    //TODO: Allow h,w as user settings
    var card_width, card_height;
    if (options.size == 'small') {
        card_width = small_card_width;
        card_height = small_card_height;
    } else {
        // Big
        card_width = big_card_width;
        card_height = big_card_height;
    }

    //Create the canvas stage
    var stage = new Konva.Stage({
      width: card_width,
      height: card_height
    });

    //Add a background layer
    var layer = new Konva.Layer();
    stage.add(layer);
    var rect = new Konva.Rect({
      width: card_width,
      height: card_height,
      x: 0,
      y: 0,
      fill: options.style.bg_color || "black"
    });


    //"Layer Router" to manage all layers and add them to stage
    var layers = (options.size === 'big') ? options.style.layers_big : options.style.layers_small;
    _.each(layers, function(layer){
        var layer_extended = extend_layer_from_defaults(layer);

        _.each(build_card_pieces_from_layer(layer_extended, options), function(image_layer){
            stage.add(image_layer);
        });
        //TODO: Add in any Konva json layer as well
    });

    return stage;
}

function image_as_layer(path, card_width, card_height) {
    var layer = new Konva.Layer();

    var imageCached = settings.image_cached_by_src(path);
    imageCached.width = card_width;
    imageCached.height = card_height;
    layer.add(imageCached);
    return layer;

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

    if (options.size === 'small') {
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


    if (renderer === 'Background Image') {
        //---------------------------------------
        pieces.push(image_as_layer(layer.src, card_width, card_height));

    } else if (renderer === 'Border') {
        //---------------------------------------
        var layer_add = draw_border_rect({
            w: card_width,
            h: card_height,
            b: border_outside_buffer,
            br: (card_width * layer.rounded),
            color: value_parser(layer, 'color', options),
            lw: 4
        });
        pieces.push(layer_add);
    } else if (renderer === 'Card Top Title') {
        //---------------------------------------
        var text = value_parser(layer, 'value', options);
        var title_text_size = parseInt(card_width * layer.size);
        if (text.length > 16) {
            title_text_size = title_text_size * .9;
        }
        if (text.length > 18) {
            title_text_size = title_text_size * .9;
        }
        if (text.length > 20) {
            title_text_size = title_text_size * .9;
        }

        //Add Text
       var layer_add = new Konva.Layer();
       var complexText = new Konva.Text({
         x: (card_width * .1),
         y: (card_height * layer.top),
         text: text,
         fontSize: title_text_size,
         fontFamily: layer.font || 'Calibri',
         fill: value_parser(layer, 'color', options) || '#555',
         width: card_width * .8,  //TODO: Verify
         // padding: 4, //TODO: Verify
         align: 'center'
       });
       layer_add.add(complexText);

        if (layer.border) {
           var padding = card_height * .01;
           var rect = new Konva.Rect({
               x: (card_width * .1),
               y: (card_height * layer.top) - padding,
               width: card_width * .8,  //TODO: Verify
               stroke: '#555',
               strokeWidth: layer.border || 2,
               fill: layer.backgroundColor,
               height: complexText.getHeight() + (padding*1.5),
               padding:padding,
               cornerRadius: layer.cornerRadius || 10
           });

           var layer_add_rect = new Konva.Layer();
           layer_add_rect.add(rect);
           pieces.push(layer_add_rect);
         }

         pieces.push(layer_add);

    } else if (renderer === 'Horizontal Line') {
        //---------------------------------------
        var line_vert_pos = (card_width * (layer.padding + layer.top));
        var line = new Konva.Line({
          x: 0,
          y: 0,
          points: [border_outside_buffer, line_vert_pos, card_width - border_outside_buffer, line_vert_pos],
          stroke: value_parser(layer, 'color', options),
          strokeWidth: (card_width * layer.width),
          tension: 1
        });
        var layer_add = new Konva.Layer();
        layer_add.add(line);
        pieces.push(layer_add);

    } else if (renderer === 'Number Diamonds') {
        //---------------------------------------
        //TODO: For some reason, the diamonds is making everything dark. Fix this
        pieces = draw_diamonds(options, card_width, card_height, (card_height * layer.top), layer);
    } else if (renderer === 'Number In Box') {
        //---------------------------------------
        var tile_width, tile_height, tile_top, tile_left;
        tile_width = parseInt(card_width * layer.scale);
        tile_height = parseInt(card_width * layer.scale * .65);
        tile_top = (card_height * layer.top);
        tile_left = (card_width * layer.left) - (tile_width/2);

        var rect_small = new Konva.Rect({
            width: tile_width
            , height: tile_height
            , x: tile_left
            , y: tile_top
            // , originX: 'center', originY: 'center'
            , cornerRadius: (card_width * layer.rounded)
            , cornerRadius: (card_width * layer.rounded)
            , strokeWidth: layer.border || 2
            , stroke: value_parser(layer, 'color', options)
        });
        var layer_add_rect = new Konva.Layer();
        layer_add_rect.add(rect_small);
        pieces.push(layer_add_rect);

        var num_text = value_parser(layer, 'value', options);
        if (num_text >= 0) num_text = "+" + num_text;
        var text_total = new Konva.Text({
            text: num_text
            , x: tile_left + (layer.text_left * card_width)
            , y: tile_top + (layer.text_top * card_height)
            , fill: (num_text < 0) ? value_parser(layer, 'negative_color', options) : value_parser(layer, 'color', options)
            , originX: 'center', originY: 'center'
            , align: 'center'
            , width:tile_width
            , fontSize: (tile_width * .6)
            , fontWeight: 'bold'
            , fontFamily: value_parser(layer, 'font', options)
        });
        var layer_add = new Konva.Layer();
        layer_add.add(text_total);
        pieces.push(layer_add);


    } else if (renderer === 'Paragraph') {
        //---------------------------------------
        var story =  value_parser(layer, 'value', options);
        var text_story = new Konva.Text({
            text: story
            , x: border_outside_buffer//(card_width * layer.left)
            , y: (card_height * layer.top)
            , fontSize: (card_width * layer.scale)
            , align: 'center'
            , width: card_width - (border_outside_buffer * 2)
            , fontWeight: 'bold'
            , fill: value_parser(layer, 'main_color', options)
            , fontFamily: value_parser(layer, 'font', options)

        });
        var layer_add = new Konva.Layer();
        layer_add.add(text_story);
        pieces.push(layer_add);

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

        var text_list_items = new Konva.Text({
            text: list_text
            , x: (card_width * layer.left)
            , y: (card_height * layer.top)
            , fontSize: (card_width * layer.scale)
            , height: (card_height * layer.box_height)
            , align: 'center'
            , width: card_width - (border_outside_buffer * 2) - 40
            , fontWeight: 'bold'
            , fill: value_parser(layer, 'color', options)
            , fontFamily: value_parser(layer, 'font', options)
        });

        var layer_add = new Konva.Layer();
        layer_add.add(text_list_items);
        pieces.push(layer_add);
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
        if (lookup_val === '{{main_color}}') {
            result = options.style.main_color;
        } else if (lookup_val === '{{positive_color}}') {
            result = options.style.positive_color;
        } else if (lookup_val === '{{negative_color}}') {
            result = options.style.negative_color;
        } else if (lookup_val === '{{second_color}}') {
            result = options.style.second_color;
        } else if (lookup_val === '{{title}}') {
            result = options.title_text;
        } else if (lookup_val === '{{value}}') {
            result = options.num_text;
        } else if (lookup_val === '{{keywords}}') {
            result = options.keywords;
        } else if (lookup_val === '{{dice}}') {
            result = options.dice_text;
        } else if (lookup_val === '{{story}}') {
            result = options.story_text;
        } else if (lookup_val === '{{font}}') {
            result = options.font || 'Impact';
        }
    } else {
        result = lookup_val;
    }

    // console.log("Lookup of " + field + " for " + lookup_val + " was " + result);
    return result;
}

function test_image_rendering(req, res) {

  var stage = new Konva.Stage({
    width:200,
    height: 200
  });
  var layer = new Konva.Layer();
  stage.add(layer);
  var rect = new Konva.Rect({
    width: 100,
    height: 100,
    x: 10,
    y: 10,
    fill: 'blue'
  });
  var text = new Konva.Text({
    text: 'TESTED!',
    x: 20,
    y: 20,
    fill: 'white'
  });
  layer.add(rect).add(text);
  layer.draw();

  stage.toDataURL({
    callback: function(data) {
      res.contentType('png');

      var base64Data = data.replace(/^data:image\/png;base64,/, '');

      var img = new Buffer(base64Data, 'base64');

      res.writeHead(200, {
       'Content-Type': 'image/png',
       'Content-Length': img.length
      });
      res.end(img);

    }
  });
}

//-------------------------------------------
function draw_border_rect(options) {

    //Build rounded rectangle around the border
    var rect = new Konva.Rect({
        width: options.w - (options.b * 2)
        , height: options.h - (options.b * 2)
        , rx: options.br
        , ry: options.br
        , x: options.b
        , y: options.b
        , fill: options.fill || 'rgba(0, 0, 0, 0)'
        , strokeWidth: options.strokeWidth || 4
        , stroke: options.color
    });

    // Add the shape to a layer
    var layer = new Konva.Layer();
    layer.add(rect);
    return layer;
}

//-------------------------------------------
function draw_diamonds(options, card_width, card_height, height_mod, layer) {
    var canvas_items = [];

    //TODO: Change all height and width and sizes to be dynamic
    var main_color = value_parser(layer, 'main_color', options);
    var second_color = value_parser(layer, 'second_color', options);
    var positive_color = value_parser(layer, 'positive_color', options);
    var negative_color = value_parser(layer, 'negative_color', options);

    var font_size_symbols = card_width / 4.2;
    var font_size_aspects = card_width / 16;

    var show_keywords = false; //TODO: This is for testing now

    var layer = new Konva.Layer();
    var diamond_1 = new Konva.Rect({
        x: card_width / 2,
        y: (card_height / 2) - 205 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        rotation: 45,
        opacity: 0.9
    });
    var text_1 = new Konva.Text({
        text: options.dice_text[0]
        , x: (card_width / 2) - 56 + (options.dice_text[0] === "-" ? 24 : 0)
        , y: (card_height / 2) - 160 + height_mod
        , fill: (options.dice_text[0] === "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: font_size_symbols
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_1 = new  Konva.Text({
        text: options.keywords[0]
        , x: (card_width / 2) - 180
        , y: (card_height / 2) - 90 + height_mod
        , originX: 'center', originY: 'center'
        , rotation: -45
        , fill: second_color
        , fontSize: font_size_aspects
        , fontWeight: 'bold'
        , fontFamily: options.style.font
        , backgroundColor: '#ccc'
    });
    var testrec1 = new  Konva.Rect({
        x: (card_width / 2) - 180
        , y: (card_height / 2) - 90 + height_mod
        , width: 100
        , height: 30
        , rotation: -45
        , fill: '#ccc'
    });
    layer.add(diamond_1);
    // layer.add(testrec1);
    layer.add(text_1);
    if (show_keywords) layer.add(keyword_1);

    var diamond_2 = new Konva.Rect({
        x: (card_width / 2) - 145,
        y: (card_height / 2) - 60 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        rotation: 45,
        opacity: 0.9
    });
    var text_2 = new Konva.Text({
        text: options.dice_text[1]
        , x: (card_width / 2) - 200 + (options.dice_text[1] == "-" ? 24 : 0)
        , y: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[1] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: font_size_symbols
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_2 = new Konva.Text({
        text: options.keywords[1]
        , x: (card_width / 2) + 180
        , y: (card_height / 2) - 90 + height_mod
        , rotation: 45
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: font_size_aspects
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    layer.add(diamond_2);
    layer.add(text_2);
    if (show_keywords) layer.add(keyword_2);

    var diamond_3 = new Konva.Rect({
        x: (card_width / 2) + 145,
        y: (card_height / 2) - 60 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        rotation: 45,
        opacity: 0.9
    });
    var text_3 = new Konva.Text({
        text: options.dice_text[2]
        , x: (card_width / 2) + 90 + (options.dice_text[2] == "-" ? 24 : 0)
        , y: (card_height / 2) - 19 + height_mod
        , fill: (options.dice_text[2] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: font_size_symbols
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_3 = new Konva.Text({
        text: options.keywords[2]
        , x: (card_width / 2) + 170
        , y: (card_height / 2) + 260 + height_mod
        , rotation: 135
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: font_size_aspects
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    layer.add(diamond_3);
    layer.add(text_3);
    if (show_keywords) layer.add(keyword_3);

    var diamond_4 = new Konva.Rect({
        x: card_width / 2,
        y: (card_height / 2) + 85 + height_mod,
        fill: main_color,
        width: 200,
        height: 200,
        rotation: 45,
        opacity: 0.9
    });
    var text_4 = new Konva.Text({
        text: options.dice_text[3]
        , x: (card_width / 2) - 56 + (options.dice_text[3] == "-" ? 24 : 0)
        , y: (card_height / 2) + 130 + height_mod
        , fill: (options.dice_text[3] == "-") ? negative_color : positive_color
        , textAlign: 'center'
        , fontSize: font_size_symbols
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    var keyword_4 = new Konva.Text({
        text: options.keywords[3]
        , x: (card_width / 2) - 170
        , y: (card_height / 2) + 260 + height_mod
        , rotation: 225
        , originX: 'center', originY: 'center'
        , fill: second_color
        , fontSize: font_size_aspects
        , fontWeight: 'bold'
        , fontFamily: options.style.font
    });
    layer.add(diamond_4);
    layer.add(text_4);
    if (show_keywords) layer.add(keyword_4);

    canvas_items.push(layer);
    return canvas_items;
}

function pdf_renderer_piper(options, res){
    var doc = new PDF({
        size: 'LEGAL', // See other page sizes here: https://github.com/devongovett/pdfkit/blob/d95b826475dd325fb29ef007a9c1bf7a527e9808/lib/page.coffee#L69

        info: {
            Title: 'TSOYD Cards, Style ' + options.style + ' - Limits of Virtue',
            Author: 'Paul Vencill and Jay Crossler'
        }
    });
    var filename ='./images/pdfs/cards_' + options.style + '_'+ options.size + '.pdf';
    console.log('Starting to write PDF file ' + filename);
    doc.pipe(fs.createWriteStream(filename)).on('finish', function () {
        console.log('Wrote PDF file ' + filename);

        fs.readFile(filename, function (err, data) {
            if (err) throw err;
            console.log(filename + ' loaded from PDF local file');

            res.writeHead(200, {'Content-Type': 'application/pdf'});
            res.end(data);
        });
    });
    //--------------------------
    var width_pixels = 804;
    var height_pixels = 1024;

    var num_x = options.size === 'big' ? 4 : 6;
    var num_y = options.size === 'big' ? 5 : 7;

    var aspect =  big_card_width / big_card_height;

    var height = Math.floor(width_pixels / num_x);
    var width = Math.floor(aspect * height);
    var page_break = (num_y * num_x);

    var bg_image = options.card_back_image;

    function page_bg(){
        doc
            .rect(0,0,width_pixels, height_pixels)
            .fill('black');
    }

    function tiled_bg_images(url){
        //TODO: Shift pixels to the right
        for (var j=0; j<page_break; j++) {
            var x = (width * (j % num_x));
            var y = (height * Math.floor((j % page_break) / num_x));
            try {
                doc.image(url, x, y, {fit: [width, height]});
            } catch (ex) {
                console.err("Error building PDF", ex);
            }
        }
    }

    page_bg();
    var last_page_added = false;
    for(var i=0; i<81; i++) {
        last_page_added = false;
        var url = "./images/cards/card_" + options.size + "_" + options.style + '_' + i + '.png';
        var x = (width * (i % num_x));
        var y = (height * Math.floor((i % page_break) / num_x));

        doc.image(url, x, y, {fit: [width, height]})
            .stroke();

        if ((i % page_break) === (page_break-1)) {
            doc.addPage();
            page_bg();
            tiled_bg_images(bg_image);

            doc.addPage();
            page_bg();
            // console.log("Adding page after image " + i + ", pagebreak " + page_break);
            last_page_added = true;
        }
    }
    if (last_page_added === false) {
        doc.addPage();
        page_bg();
        tiled_bg_images(bg_image);
    }

    doc.end();
}


//======================================
module.exports = {
    show_thumbnails: show_thumbnails,
    card_renderer_manager: card_renderer_manager,
    test_image_rendering: test_image_rendering,
    pdf_renderer_piper: pdf_renderer_piper
};
