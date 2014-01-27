function getIncludeFiles() {
    return {
        js: [
            'assets/extjs/ext-all-debug.js',
            'assets/leaflet/leaflet.js',
            'assets/ux/Leaflet.js',
            'assets/leaflet-ux/contextmenu/leaflet.contextmenu.js',
            'assets/leaflet-ux/Polyline.encoded.js',
            'assets/leaflet-ux/zoomslider/L.Control.Zoomslider.js',
            'assets/leaflet-ux/layer/tile/Google.js',
            'assets/leaflet-ux/locatecontrol/L.Control.Locate.js',
            'assets/leaflet-ux/leaflet.restoreview.js',
            'assets/leaflet-ux/awesomemarkers/leaflet.awesome-markers.js',

            'src/AddressField.js',
            'src/SuggestedView.js',
            'src/TripDescriptionView.js',
            'src/App.js'
        ],
        css: [
            'assets/extjs/resources/css/ext-all-neptune.css',
            'css/bootstrap.css',
            'assets/leaflet/leaflet.css',
            'assets/leaflet-ux/contextmenu/leaflet.contextmenu.css',
            'assets/leaflet-ux/locatecontrol/L.Control.Locate.css',
            'assets/leaflet-ux/zoomslider/L.Control.Zoomslider.css',
            'assets/leaflet-ux/awesomemarkers/leaflet.awesome-markers.css',
            'css/font-awesome.css',
            'css/app.css'
        ]
    };
}

if ( typeof Ride !== 'undefined' && Ride ) {
    var files = getIncludeFiles(), i, file;

    for(i=0;i<files.css.length;i++) {
        file = files.css[i];
        document.write('<link rel="stylesheet" type="text/css" href="'+file+'"/>');
    }

    if(Ride.Config.debug) {
        for(i=0;i<files.js.length;i++) {
            file = files.js[i];
            document.write('<script src="'+file+'" type="text/javascript"></script>');
        }
    } else {
        var version = "0.1.19";
        document.write('<script src="build/build'+version+'.min.js" type="text/javascript"></script>');
    }
}

if(typeof module !== 'undefined' && module) {
    module.exports.getIncludeFiles = getIncludeFiles;
}