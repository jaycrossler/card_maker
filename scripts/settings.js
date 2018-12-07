var _ = require('underscore')
    , Konva = require('konva-node');


var images_to_preload_into_memory = ['images/blue_hex_bg.png', 'images/red_hex_bg.png',
    'images/blue_hex_bg2.png', 'images/red_hex_bg2.png',
    'images/silhouette-of-an-unknown-soldier.png', 'images/card_white_shield1.png',
    'images/card_white_shield2.png', 'images/card_white_shield3.png',
    'images/card_with_shield3.png', 'images/card_with_shield3_alpha.png',
    'images/card_with_shield3_symbol.png', 'images/symbol_triangle.png'];
var layer_defaults = [
    {renderer: 'Background Image', src:'blue_hex_bg'}
    ,{renderer: 'Image', src:'symbol_triangle'}
    ,{renderer: 'Border', padding: .03, rounded: .02, color: '{{main_color}}'}
    ,{renderer: 'Card Top Title', font: 'Impact', top: .05, size: .1, color: '{{main_color}}', value: '{{title}}'}//, border:2, cornerRadius:10, backgroundColor:'gray'
    ,{renderer: 'Horizontal Line', padding: .03, top: .16, width: .005, color:'{{main_color}}'}
    ,{renderer: 'Paragraph', top: .18,  scale: .035, box_height: .16, value:'{{story}}', color:'{{main_color}}'}
    ,{renderer: 'Number Diamonds', top: -.05, values: '{{dice}}', outside_text:'{{keywords}}'}
    ,{renderer: 'Number In Box', scale: .19, top: .23, left:.82, text_left: -.008, text_top: .008, value:'{{value}}', color:'{{main_color}}', rounded: 0, font:'Impact', fill_bg:'{{transparent}}'}
    ,{renderer: 'Number In Circle', scale: .2, top: 0.05, left:0.2, border:10, value:'{{value}}', color:'{{main_color}}', fill_bg:'{{bg_color}}', rounded: 0, font:'Impact'}
    // ,{renderer: 'Text List', top: .52, left:.5, scale: 0.09, box_height: .2, values:'{{keywords}}', color:'{{second_color}}', title:''}
];
var default_card_style = {
    bg_image: 0, bg_color: 'green', card_back_image: './images/silhouette-of-an-unknown-soldier.png',
    main_color: 'yellow', second_color: 'white', font: 'Impact', background_src:'images/blue_hex_bg',
    negative_color: 'red', positive_color: 'black',
    deck_type: 'Fate 81', content_type: ' Aeon Paul',
    layers_big: [
        {renderer: 'Background Image'}
        ,{renderer: 'Border'}
        ,{renderer: 'Card Top Title'}
        ,{renderer: 'Horizontal Line'}
        ,{renderer: 'Paragraph'}
        ,{renderer: 'Number Diamonds'}
        ,{renderer: 'Number In Box'}
    ],
    layers_small: [
        {renderer: 'Background Image'}
        ,{renderer: 'Border', rounded: 0}
        ,{renderer: 'Card Top Title'}
        ,{renderer: 'Horizontal Line', top: .15}
        ,{renderer: 'Number In Box', scale: .4, top:.33, rounded: .05, left:.5}
        // ,{renderer: 'Text List', title:'ASPECTS:', top: .52, values:'{{keywords}}', unique:true}
    ]
};

//TODO: Fonts aren't being applied
var card_styles = [
    {
        id: 1, name: 'Aeon', bg_image: 0, bg_color: 'green',
        main_color: 'yellow', second_color: 'white', negative_color: 'red', positive_color: 'black',
        deck_type: 'Fate 81', content_type: ' Aeon Paul'
    }

    , {
        id: 2, name: 'Garden of Musk', bg_image: 1, bg_color: 'black',
        main_color: 'red', second_color: 'orange', negative_color: 'yellow', positive_color: 'orange', font: 'Arial'
    }

    , {id: 3, name: 'Swords and Suckers', bg_image: 3, main_color: 'gray', second_color: 'orange' }

    , {id: 4, name: 'Ye Olde Horror Shacke', bg_image: 2, main_color: 'green' }

    , {id: 5, name: 'Limits of Virtue', bg_image: 5, bg_color: 'white', main_color: 'gray', second_color: 'orange',
        negative_color: 'red', positive_color: 'yellow', background_src:'card_with_shield3_alpha',
        layers_big: [
            {renderer: 'Background Image'}
            ,{renderer: 'Image', width: .8, height: .4, x: .1, y: .22, opacity: .6, src:'symbol_triangle'}
            ,{renderer: 'Card Top Title', top: .07, size: .09}
            ,{renderer: 'Horizontal Line', padding: .04, top: .17, width: .005}
            ,{renderer: 'Paragraph', top: .17, scale: .03, fontStyle: 'italic'}
            ,{renderer: 'Number Diamonds', y: .42, x: .3, scale:.4}
            ,{renderer: 'Number In Circle'}
        ]
    }

    // , {id: 5, name: 'Build your own decks!', bg_image: 0}
];

var samples = {
    keywords: 'Artillery Scouts Stealth Airpower Cyber Logistics Leader Weather Terrain Tunnel Sabotage Charge Fuel Morale'.split(' '),
    flavor_text: "1LT Dewberry was a helicopter pilot - well liked, intelligent and popular with the ladies.  Unfortunately, none of those traits discouraged the incoming MANPAD rocket."
};

//Configurations and Cache arrays
var images_cached_in_memory = [],
    image_file_list = [];

//--------------------------------------

function preload_images() {
    _.each(images_to_preload_into_memory, function (src, id) {
        var image = new Konva.window.Image();
        image.onload = function() {
            images_cached_in_memory.push({id:id, src:src, image:image});
            console.log("Loaded Image into memory #" + id + ': ' + src);
        };
        image.src = src;

    });
}


function image_cached_by_src(src) {
    var img = _.find(images_cached_in_memory, function(img_info){ return (img_info.src.indexOf(src) > -1)});
    return (img && img.image) ? img.image : {};
}

function style_data_from_id (id) {
    return _.find(card_styles, function (style) {
        return style.id == id
    });
}

function rand_keywords_from_seed (id) {
    rand_seed = id;
    var items = samples.keywords;
    var keyword_1 = items[Math.floor(random() * items.length)];
    var keyword_2 = items[Math.floor(random() * items.length)];
    var keyword_3 = items[Math.floor(random() * items.length)];
    var keyword_4 = items[Math.floor(random() * items.length)];

    //TODO: Make it more likely that higher cards have less keywords, and lower have more
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

    return [keyword_1, keyword_2, keyword_3, keyword_4];
}



//======================================
//Temporary Randomness function
var rand_seed = 1;
function random() {
    var x = Math.sin(rand_seed++) * 10000;
    return x - Math.floor(x);
}

//======================================
module.exports = {
    card_styles: card_styles
    , samples: samples
    , images_to_preload_into_memory: images_to_preload_into_memory
    , image_file_list: image_file_list
    , layer_defaults: layer_defaults
    , default_card_style: default_card_style
    , preload_images: preload_images
    , image_cached_by_src: image_cached_by_src
    , style_data_from_id: style_data_from_id
    , rand_keywords_from_seed: rand_keywords_from_seed
};
