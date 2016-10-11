
var exportBaseBigPng = function(context) {

    //sandbox thanks to @nickstamas

    var environ = [[NSProcessInfo processInfo] environment],
    in_sandbox= (nil != [environ objectForKey:"APP_SANDBOX_CONTAINER_ID"])

    if(in_sandbox){
        print("We’re sandboxed: here be dragons")
    }

    AppSandbox = function(){ }
    AppSandbox.prototype.authorize = function(path, callback){
        log("AppSandbox.authorize("+path+")")
        var success = false

        if (in_sandbox) {
            var url = [[[NSURL fileURLWithPath:path] URLByStandardizingPath] URLByResolvingSymlinksInPath],
            allowedUrl = false

            var bd_key = this.key_for_url(url)

            this.clear_key(bd_key)

            var bookmark = this.get_data_for_key(bd_key)
            if(!bookmark){
                log("- No bookmark,please create one")
                var target = this.file_picker(url)
                bookmark = [target bookmarkDataWithOptions:NSURLBookmarkCreationWithSecurityScope
                            includingResourceValuesForKeys:nil
                            relativeToURL:nil
                            error:{}]

            this.set_data_for_key(bookmark,bd_key)
            } else {
                log("– Bookmark found")
            }

            log("  " + bookmark)

            var bookmarkDataIsStalePtr = MOPointer.alloc().init()
            var allowedURL = [NSURL URLByResolvingBookmarkData:bookmark
                                options:NSURLBookmarkResolutionWithSecurityScope
                                relativeToURL:nil
                                bookmarkDataIsStale:bookmarkDataIsStalePtr
                                error:{}]

            if(bookmarkDataIsStalePtr.value() != 0){
                log("— Bookmark data is stale")
                log(bookmarkDataIsStalePtr.value())
            }

            if(allowedURL) {
                success = true
            }

        } else {
            success = true
        }

        callback.call(this,success)
    }

    AppSandbox.prototype.key_for_url = function(url){
        return "bd_" + [url absoluteString]
    }
    AppSandbox.prototype.clear_key = function(key){
        var def = [NSUserDefaults standardUserDefaults]
        [def setObject:nil forKey:key]
    }
    AppSandbox.prototype.file_picker = function(url){
        var openPanel = [NSOpenPanel openPanel]

        [openPanel setTitle:"Sketch Authorization"]
        [openPanel setMessage:"Due to Apple's Sandboxing technology, Sketch needs your permission to write to this folder."];
        [openPanel setPrompt:"Authorize"];

        [openPanel setCanCreateDirectories:false]
        [openPanel setCanChooseFiles:true]
        [openPanel setCanChooseDirectories:true]
        [openPanel setAllowsMultipleSelection:false]
        [openPanel setShowsHiddenFiles:false]
        [openPanel setExtensionHidden:false]

        [openPanel setDirectoryURL:url]

        var openPanelButtonPressed = [openPanel runModal]
        if (openPanelButtonPressed == NSFileHandlingPanelOKButton) {
            allowedUrl = [openPanel URL]
        }
        return allowedUrl
    }

    AppSandbox.prototype.get_data_for_key = function(key){
        var def = [NSUserDefaults standardUserDefaults]
        return [def objectForKey:key]
    }
    AppSandbox.prototype.set_data_for_key = function(data,key){
        var defaults = [NSUserDefaults standardUserDefaults],
            default_values = [NSMutableDictionary dictionary]

        [default_values setObject:data forKey:key]
        [defaults registerDefaults:default_values]
    }

    //icon offset

    var DEFAULT_SIZE = 24;

    function actionWithType(type, context) {
        var doc = context.document;

        var controller = doc.actionsController();
        if (controller.actionWithName) {
            return controller.actionWithName(type);
        } else if (controller.actionWithID) {
            return controller.actionWithID(type);
        }
    }


    var doc = context.document,
        selection = context.selection,
        view = doc.currentView(),
        layer = selection[0];

    if (selectionContainsArtboards(context)) { 
        doc.displayMessage("😭 Can't export Artboards! Please remove all the artboards from the selection. ");
        return;
    }

    if (selection.count() < 1) { 
        doc.displayMessage("😭 Can't export an emptiness! Please select some layers and try again. ");
        return;
    }

    var frame = [layer frame],
        height = [frame height],
        width = [frame width],
        scale;

    function layerOffset(layer, x, y) {
        var rect = layer.rect();
        rect.origin.x = x;
        rect.origin.y = y;

        layer.rect = rect;
    }


    var defSize = doc.askForUserInput_initialValue("Please input the size of icon viewBox :", "24")

    if (defSize == "") defSize = DEFAULT_SIZE;

    var iconSize = changeSizeWithBorder(layer,defSize),
        layerSize = defSize;


    var action = actionWithType("MSCanvasActions", context);


    var sliceSmall = creatSliceLayer(layerSize*0.5),
        sliceMiddle = creatSliceLayer(layerSize*1),
        sliceBig = creatSliceLayer(layerSize*1.5);

    sliceSmall.setName("Undefined New Slice @1x");
    sliceMiddle.setName("Undefined New Slice @2x");
    sliceBig.setName("Undefined New Slice @3x");

    var layerSmall = sizeOffset(changeSizeWithBorder(layer,defSize*0.5),layerSize*0.5),
        layerMiddle = sizeOffset(changeSizeWithBorder(layer,defSize*1),layerSize*1),
        layerBig = sizeOffset(changeSizeWithBorder(layer,defSize*1.5),layerSize*1.5);

    var newLayerBig = createNewArtboardFromSelection(layer,1.5);
    newLayerBig.addLayer(layerBig)
    newLayerBig.addLayer(sliceBig)

    var newLayerMiddle = createNewArtboardFromSelection(layer,1);
    newLayerMiddle.addLayer(layerMiddle)
    newLayerMiddle.addLayer(sliceMiddle)

    var newLayerSmall = createNewArtboardFromSelection(layer,0.5);
    newLayerSmall.addLayer(layerSmall)
    newLayerSmall.addLayer(sliceSmall)


    var com = {};
    com.animal = {
        exportWithFactors: function(factors) {
            if ([selection count] == 0) {
                [doc showMessage:"No layer is selected."];
            } else {
                var openDlg = [NSOpenPanel openPanel];
                [openDlg setCanChooseFiles:false];
                [openDlg setCanChooseDirectories:true];
                [openDlg setAllowsMultipleSelection:false];
                [openDlg setPrompt:"Select"];

                if ( [openDlg runModalForDirectory:nil file:nil] == NSOKButton ) {

                    for (var j=0; j < [selection count]; j++) {

                        var layer = [selection objectAtIndex:j];
                        var parent =  ([layer parentArtboard]) ? [layer parentArtboard] : [doc currentPage];
                        var layerVisibility = [];

                        [parent deselectAllLayers];

                        var layerArray = [layer];
                        [parent selectLayers:layerArray];

                        var root = parent;

                        var hideLayers = function(root, target) {
                            for (var k=0; k < [[root layers] count]; k++) {
                                var currentLayer = [[root layers] objectAtIndex:k];
                                if ([currentLayer containsSelectedItem] && currentLayer != target) {
                                    hideLayers(currentLayer, target);
                                } else if (!(currentLayer == target)) {
                                    var dict = {
                                    "layer": currentLayer,
                                    "visible": [currentLayer isVisible]
                                    };

                                    layerVisibility.push(dict);
                                    [currentLayer setIsVisible: false];
                                }
                            }
                        }

                        var layerClassString = NSStringFromClass([layer class]);

                        log("layerClassString");
                        log(layerClassString);

                        if (!(layerClassString == "MSSliceLayer")) {
                            hideLayers(root, layer);
                        }

                        var smallSliceRect = [[sliceSmall absoluteRect] rect];
                        var path = [[[openDlg URLs] objectAtIndex:0] fileSystemRepresentation];

                        new AppSandbox().authorize(path, function() {
                            for (var f=0; f < factors.length; f++) {
                                var factor = factors[f];
                                slice = [MSExportRequest requestWithRect:smallSliceRect scale:factor["scale"]];
                                [doc saveArtboardOrSlice:slice toFile:path + "/" + [layer name] + "_@" + factor["scale"] + "x" + ".png"];
                            }
                        });

                        for (var m=0; m < layerVisibility.length; m++) {
                            var dict   = layerVisibility[m];
                            layer      = dict.layer;
                            visibility = dict.visible;

                            if (visibility == 0) {
                                [layer setIsVisible:false];
                            } else {
                                [layer setIsVisible:true];
                            }
                        }

                        [parent selectLayers:selection];

                    }

                    [doc showMessage: "😄 Readied your slices in " + path];
                }
            }
        }
    }


    var factors = [
        {name: "@1x", scale: 1.0},
        {name: "@2x", scale: 2.0},
        {name: "@3x", scale: 3.0}
    ];

    com.animal.exportWithFactors(factors);

    // [view centerRect:[newLayerMiddle rect]]

    function sizeOffset(sizeA,sizeB) {

        var layerCopy = [layer copy],
            layerFrame = [layerCopy frame]

        if (height >= width) {
            scale = sizeA / height;
            layerHeight = sizeA;
            originWidth = scale * width;
            layerWidth = originWidth.toFixed(2)
        } else {
            scale = sizeA / width;
            layerWidth = sizeA;
            originHeight = scale * height;
            layerHeight = originHeight.toFixed(2)
        }

        [layerFrame setWidth:layerWidth]
        [layerFrame setHeight:layerHeight]
        layerOffset(layerCopy, (sizeB - layerWidth) / 2, (sizeB - layerHeight) / 2) //align centre

        return layerCopy;

    }

      function creatSliceLayer(size){
        var a = MSSliceLayer.new(),
        aFrame = [a frame];

        [aFrame setWidth:size];
        [aFrame setHeight:size];

        return a;
    }

    function changeSizeWithBorder(layer,size){

        var selStyle = [layer style]
        var borders = [[selStyle borders] count]

        if(borders){

            borderEnabled = [[selStyle border] isEnabled]
            borderSize = [[selStyle border] thickness]
            borderPosition = [[selStyle border] position]

            if (borderEnabled == "1" && [selStyle border]) {
                if (borderPosition == "0") {
                    borderSize = borderSize / 2;
                    size = size - 2 * borderSize;
                };

                if (borderPosition == "2") {
                    size = size - 2 * borderSize;
                };
            };
        }

        return size;

    }


    function createNewArtboardFromSelection(selectedItem,multiple) {
        selectedItemRect = [selectedItem absoluteRect]
        newArtboardWidth = [selectedItemRect width]
        newArtboardHeight = [selectedItemRect height])
        newArtboardX = rightmostArtboardX() + 50
        newArtboardY = topmostArtboardY()

        newArtboard = [MSArtboardGroup new]
        newArtboardFrame = [newArtboard frame]
        [newArtboard setName:"New Slice"+" @"+multiple+"x"]
        [newArtboardFrame setWidth:layerSize*multiple]
        [newArtboardFrame setHeight:layerSize*multiple]
        [newArtboardFrame setX:newArtboardX]
        [newArtboardFrame setY:newArtboardY]

        page = [doc currentPage]
        [page addLayers:[NSArray arrayWithObjects:newArtboard]]

        return newArtboard
    }

    function rightmostArtboardX() {
        artboards = [[doc currentPage] artboards]
        firstArtboard = artboards[0]
        firstArtboardRect = [firstArtboard absoluteRect]
        maxXPos = [firstArtboardRect maxX]
        loop = [artboards objectEnumerator]
        while (artboard = [loop nextObject]) {
            artboardRect = [artboard absoluteRect]
            artboardMaxX = [artboardRect maxX]
            if (artboardMaxX >= maxXPos) {
                maxXPos = artboardMaxX
            }
        }
        return maxXPos
    }

    function topmostArtboardY() {
        artboards = [[doc currentPage] artboards]
        firstArtboard = artboards[0]
        firstArtboardRect = [firstArtboard absoluteRect]
        minYPos = [firstArtboardRect minY]
        loop = [artboards objectEnumerator]
        while (artboard = [loop nextObject]) {
            artboardRect = [artboard absoluteRect]
            artboardMinY = [artboardRect minY]
            if (artboardMinY <= minYPos) {
                minYPos = artboardMinY
            }
        }
        return minYPos
    }

    function copySelectionToNewArtboard(selectedItem, newArtboard) {
        selectedItemCopy = [selectedItem duplicate]
        [[newArtboard layers] addObject:selectedItemCopy]

        selectedItemCopyFrame = [selectedItemCopy frame]
        [selectedItemCopyFrame setX:0]
        [selectedItemCopyFrame setY:0]

        parentGroup = [selectedItem parentGroup]
        [parentGroup removeLayer:selectedItemCopy]
    }



    function selectionContainsArtboards(context) {
        var selection = context.selection;

        for (var i = 0; i < selection.count(); i++) {
            var layer = selection.objectAtIndex(i);
            if (layer.className() == "MSArtboardGroup") return true;
        }

        return false;
    }

};

var ExportBase1x = function(){}

