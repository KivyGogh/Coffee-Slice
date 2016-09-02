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
        view = [doc currentView],
        layer = selection[0];

    if (selectionContainsArtboards(context)) { 
        doc.displayMessage("😭 Can't export Artboards! Please remove all the artboards from the selection. ");
        return;
    }

    if (selection.count() < 1) { 
        doc.displayMessage("😭 Can't export an emptiness! Please select some layers and try again. ");
        return;
    }

    function layerOffset(layer, x, y) {
        var rect = layer.rect();
        rect.origin.x = x;
        rect.origin.y = y;

        layer.rect = rect;
    }


    var defSize = doc.askForUserInput_initialValue("Please input the size of icon viewBox :", "24")

    if (defSize == "") defSize = DEFAULT_SIZE;

    var iconSize = changeSizeWithBorder(layer,defSize);
        layerSize = defSize;


    var action = actionWithType("MSCanvasActions", context);


    var a = MSSliceLayer.new(),
        frame = a.frame();

    frame.setWidth(layerSize);
    frame.setHeight(layerSize);

    a.setName("Undefined New Slice");

    var layerCopy = layer.copy(),
        layerFrame = layerCopy.frame()


    var frame = [layer frame],
        height = [frame height],
        width = [frame width],
        scale;

    if (height >= width) {
        scale = iconSize / height;
        height = iconSize;
        originWidth = scale * width;
        width = originWidth.toFixed(2)
    } else {
        scale = iconSize / width;
        width = iconSize;
        originHeight = scale * height;
        height = originHeight.toFixed(2)
    }

    layerFrame.setWidth(width)
    layerFrame.setHeight(height)
    layerOffset(layerCopy, (layerSize-width)/2, (layerSize-height)/2) //align centre
    [doc showMessage: "Readied your slice!😉  Width: " + width + ";  Height:" + height];

    var p = createNewArtboardFromSelection(layer);
    p.addLayer(layerCopy)
    p.addLayer(a)

    [view zoomToFitRect:[p rect]]


     //toward multifarious selection...just wait...

    // var _layer = sel.objectAtIndex(0);
    // var sel = doc.findSelectedLayers();

    function changeSizeWithBorder(layer,size){

        var selStyle = [layer style]
        var borders = [[selStyle borders] count]

        if(borders){

            borderEnabled = [[selStyle border] isEnabled]
            borderSize = [[selStyle border] thickness]
            borderPosition = [[selStyle border] position]

            if (borderEnabled == "1" && layer.style().border()) {
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


    function createNewArtboardFromSelection(selectedItem,size) {
        selectedItemRect = [selectedItem absoluteRect]
        newArtboardWidth = [selectedItemRect width]
        newArtboardHeight = [selectedItemRect height])
        newArtboardX = rightmostArtboardX() + 100
        newArtboardY = topmostArtboardY()

        newArtboard = [MSArtboardGroup new]
        newArtboardFrame = [newArtboard frame]
        [newArtboard setName:"New Slice"]
        [newArtboardFrame setWidth:layerSize]
        [newArtboardFrame setHeight:layerSize]
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

