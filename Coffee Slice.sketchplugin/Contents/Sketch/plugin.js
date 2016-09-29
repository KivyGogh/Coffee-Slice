

var onRun = function(context) {

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


    var sliceSmall = creatSliceLayer(layerSize),
        sliceMiddle = creatSliceLayer(layerSize*2),
        sliceBig = creatSliceLayer(layerSize*3);

    sliceSmall.setName("Undefined New Slice @1x");
    sliceMiddle.setName("Undefined New Slice @2x");
    sliceBig.setName("Undefined New Slice @3x");

    var layerSmall = sizeOffset(changeSizeWithBorder(layer,defSize),layerSize),
        layerMiddle = sizeOffset(changeSizeWithBorder(layer,defSize*2),layerSize*2),
        layerBig = sizeOffset(changeSizeWithBorder(layer,defSize*3),layerSize*3);

    [doc showMessage: "Readied your slices!😉"];

    var newLayerBig = createNewArtboardFromSelection(layer,3);
    newLayerBig.addLayer(layerBig)
    newLayerBig.addLayer(sliceBig)

    var newLayerMiddle = createNewArtboardFromSelection(layer,2);
    newLayerMiddle.addLayer(layerMiddle)
    newLayerMiddle.addLayer(sliceMiddle)

    var newLayerSmall = createNewArtboardFromSelection(layer,1);
    newLayerSmall.addLayer(layerSmall)
    newLayerSmall.addLayer(sliceSmall)

    [view centerRect:[newLayerMiddle rect]]

     //toward multifarious selection...just wait...

    // var _layer = sel.objectAtIndex(0);
    // var sel = doc.findSelectedLayers();

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

