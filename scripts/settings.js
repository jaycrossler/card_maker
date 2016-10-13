var _ = require('underscore')
    , fabric = require('fabric').fabric
    , Q = require('Q');


var images_to_preload_into_memory = ['images/blue_hex_bg.png', 'images/red_hex_bg.png', 'images/blue_hex_bg2.png', 'images/red_hex_bg2.png'];
var card_styles = [
    {
        id: 1, name: 'Aeon', bg_image: 0, bg_color: 'black',
        main_color: 'yellow', second_color: 'white', negative_color: 'red', positive_color: 'black',
        layout: 'central', dice_display: 'diamonds', total: 'top middle',
        layers_big: [
            {renderer: 'Background Image', src:'blue_hex_bg'},
            {renderer: 'Border', rounded: .02, color: '{{main-color}}'},
            {renderer: 'Card Top Title', font: 'Impact', color: '{{main-color}}'},
            {renderer: 'Horizontal Line', buffer: '{{border_outside_buffer}}', top: '{{border_outside_buffer}} + .16', width: .005},
            {renderer: 'Number Diamonds', values: '{{dice}}', color:'{{positive_color}}', negative_color: '{{negative_color}}', outside_text:'{{keywords}}'},
            {renderer: 'Number in Box', value:'{{total}}', color:'{{main_color}}', negative_color: '{{negative_color}}', scale: 'Medium', position:'Top Middle'},
            {renderer: 'Paragraph', value:'{{description}}', color:'{{main_color}}', box:'none', background_color:'none'}
        ],
        layers_small: [
            {renderer: 'Background Image', src:'blue_hex_bg'},
            {renderer: 'Border', rounded: .02, color: '{{main-color}}'},
            {renderer: 'Card Top Title', font: 'Impact', color: '{{main-color}}'},
            {renderer: 'Horizontal Line', buffer: '{{border_outside_buffer}}', top: '{{border_outside_buffer}} + .14', width: .005},
            {renderer: 'Number in Box', value:'{{total}}', color:'{{main_color}}', negative_color: '{{negative_color}}', scale: 'Large', position:'Center Middle'},
            {renderer: 'Text List', values:'{{keywords}}', color:'{{second_color}}', title:'Aspects:'}
        ]
    }

    , {
        id: 2, name: 'Garden of Musk', bg_image: 1, bg_color: 'black',
        main_color: 'red', second_color: 'orange', negative_color: 'white', positive_color: 'orange',
        layout: 'stacked', dice_display: 'square', total: 'bottom right', total_small: 'center middle', font: 'Arial'
    }

    , {id: 3, name: 'Swords and Suckers', bg_image: 3}

    , {id: 4, name: 'Ye Olde Horror Shacke', bg_image: 2}

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
    function load_bg_image(src, id, callback) {
        fabric.util.loadImage(src, function (img) {
            image_cached_add(id, src, new fabric.Image(img));
            return callback();
        });
    }

    var the_promises = [];
    _.each(images_to_preload_into_memory, function (src, i) {
        var deferred = Q.defer();

        load_bg_image(src, i, function (result) {
            deferred.resolve(result);
        });
        the_promises.push(deferred.promise);
    });

    return Q.all(the_promises);
}

function image_cached_add(id, src, image) {
    images_cached_in_memory.push({id:id, src:src, image:image});
    console.log("Loaded BG Image " + id + ': ' + src);
}

function image_cached_by_src(src) {
    var img = _.find(images_cached_in_memory, function(img_info){ return (img_info.src.indexOf(src) > -1)});
    return img.image ? img.image : "";
}

function style_data_from_id (id) {
    //TODO: Extend the default object with style-specific items
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
    , preload_images: preload_images
    , image_cached_by_src: image_cached_by_src
    , image_cached_add: image_cached_add
    , style_data_from_id: style_data_from_id
    , rand_keywords_from_seed: rand_keywords_from_seed
};