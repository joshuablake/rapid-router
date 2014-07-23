'use strict';

var ocargo = ocargo || {};

ocargo.BlocklyControl = function () {
    var blockly = document.getElementById('blockly');
    var toolbox = document.getElementById('toolbox');
    Blockly.inject(blockly, {
        path: '/static/game/js/blockly/',
        toolbox: toolbox,
        trashcan: true
    });

    // Disable the right-click context menus
    Blockly.showContextMenu_ = function(e) {};
    Blockly.Block.prototype.showContextMenu_ = function(e) {};

    this.numberOfStartBlocks = 0;
}

ocargo.BlocklyControl.prototype.BLOCK_HEIGHT = 20;
ocargo.BlocklyControl.prototype.EXTRA_BLOCK_WIDTH = 1;
ocargo.BlocklyControl.prototype.IMAGE_WIDTH = 20;

ocargo.BlocklyControl.prototype.incorrectBlock = null;
ocargo.BlocklyControl.prototype.incorrectBlockColour = null;

ocargo.BlocklyControl.prototype.prepare = function() {
    try {
        return ocargo.blocklyCompiler.compile();
    }
    catch (error) {
        // print error for now
        console.info("compilation error " + error);
        return null;
    }
};

ocargo.BlocklyControl.prototype.redrawBlockly = function() {
    Blockly.fireUiEvent(window, 'resize');
};

ocargo.BlocklyControl.prototype.reset = function() {
    Blockly.mainWorkspace.clear();

    this.numStartBlocks = 0;

    for (var i = 0; i < THREADS; i++) {
        var startBlock = this.createBlock('start');
        startBlock.moveBy(30+(i%2)*200,30+Math.floor(i/2)*100);
    }
    this.addClickListenerToStartBlocks();
};

ocargo.BlocklyControl.prototype.teardown = function() {
    if (localStorage) {
        var text = ocargo.blocklyControl.serialize();
        try {
            localStorage.setItem('blocklyWorkspaceXml-' + LEVEL_ID, text);
        } catch (e) {
            // No point in even logging, as page is unloading
        }
    }
};

ocargo.BlocklyControl.prototype.deserialize = function(text) {
    try {
        var xml = Blockly.Xml.textToDom(text);
        Blockly.mainWorkspace.clear();
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
        ocargo.blocklyControl.removeIllegalBlocks();
        ocargo.blocklyControl.addClickListenerToStartBlocks();
    } catch (e) {
        ocargo.blocklyControl.reset();
    }
};

ocargo.BlocklyControl.prototype.serialize = function() {
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    var text = Blockly.Xml.domToText(xml);
    return text;
};

ocargo.BlocklyControl.prototype.removeIllegalBlocks = function() {
    var blocks = Blockly.mainWorkspace.getAllBlocks();
    var block;
    for (var i = 0; i < blocks.length; i++) {
        block = blocks[i];
        if (BLOCKS.indexOf(block.type) === -1 && block.type !== 'start') {
            block.dispose();
        }
    }
};

ocargo.BlocklyControl.prototype.loadPreviousAttempt = function() {
    function decodeHTML(text) {
        var e = document.createElement('div');
        e.innerHTML = text;
        return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }

    // Use the user's last attempt if available, else use whatever's in local storage
    if (WORKSPACE) {
        ocargo.blocklyControl.deserialize(decodeHTML(WORKSPACE));
    }
    else {
        ocargo.blocklyControl.deserialize(localStorage.getItem('blocklyWorkspaceXml-' + LEVEL_ID));
    }

    ocargo.blocklyControl.redrawBlockly();
}

ocargo.BlocklyControl.prototype.createBlock = function(blockType) {
    var block = Blockly.Block.obtain(Blockly.mainWorkspace, blockType);
    block.initSvg();
    block.render();
    return block;
};

ocargo.BlocklyControl.prototype.addBlockToEndOfProgram = function(blockType) {
    var blockToAdd = this.createBlock(blockType);

    var block = this.getStartBlocks()[0];
    while (block.nextConnection.targetBlock()) {
        block = block.nextConnection.targetBlock();
    }

    block.nextConnection.connect(blockToAdd.previousConnection);
};

ocargo.BlocklyControl.prototype.getStartBlocks = function() {
    var startBlocks = [];
    Blockly.mainWorkspace.getTopBlocks().forEach(function (block) {
        if (block.type === 'start') {
            startBlocks.push(block);
        }
    });
    return startBlocks;
};

ocargo.BlocklyControl.prototype.getBlocksCount = function() {
    return Blockly.mainWorkspace.getAllBlocks().length;
};

ocargo.BlocklyControl.prototype.addClickListenerToStartBlocks = function() {
    var startBlocks = this.getStartBlocks();
    if (startBlocks) {
        for (var i = 0; i < startBlocks.length; i++) {
            var startBlock = startBlocks[i];
            var svgRoot = startBlock.getSvgRoot();
            if (svgRoot) {
                if (!svgRoot.id || svgRoot.id === "") {
                    svgRoot.id = "startBlockSvg" + i;
                }
                var downX = 0;
                var downY = 0;
                var maxMove = 5;
                $('#' + svgRoot.id).on({
                    mousedown: function(e) {
                        downX  = e.pageX;
                        downY   = e.pageY;
                    },
                    mouseup: function(e) {
                        if ( Math.abs(downX - e.pageX) < maxMove && Math.abs(downY - e.pageY) < maxMove) {
                            var playEls = $('#play');
                            if(playEls && playEls.length && playEls.length > 0){
                                playEls[0].click();
                            }
                        }
                    }
                });
            }
        }
    } 
};


/*******************/
/** Big Code Mode **/
/*******************/

ocargo.BlocklyControl.prototype.resetWidthOnBlocks = function(blocks){
	for (var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		for( var j = 0; j < block.inputList.length; j++){
			var input = block.inputList[j];
			for(var k = 0; k < input.fieldRow.length; k++){
				input.fieldRow[k].size_.width = null;
			}
		}
	}
};

//so that image fields render properly when their size_ variable is broken above
Blockly.FieldImage.prototype.render_ = function(){
    this.size_ = {height: this.height_ + 10, width: this.width_};
};

ocargo.BlocklyControl.prototype.increaseBlockSize = function(){
	ocargo.blocklyControl.bigCodeMode = true;
    Blockly.BlockSvg.FIELD_HEIGHT *= 2; //30
    Blockly.BlockSvg.MIN_BLOCK_Y *= 2; // 25
    Blockly.BlockSvg.JAGGED_TEETH_HEIGHT *= 2; //20
    Blockly.BlockSvg.JAGGED_TEETH_WIDTH *= 2;
    Blockly.BlockSvg.SEP_SPACE_X *= 2;
    Blockly.BlockSvg.SEP_SPACE_Y *= 2;
    Blockly.BlockSvg.INLINE_PADDING_Y *= 2;
    Blockly.Icon.RADIUS *= 2;
    
    /*Blockly.BlockSvg.NOTCH_PATH_LEFT = 'l 12,8 6,0 12,-8';
    Blockly.BlockSvg.NOTCH_PATH_LEFT_HIGHLIGHT = 'l 13,4 4,0 13,-8';
    Blockly.BlockSvg.NOTCH_PATH_RIGHT = 'l -12,4 -6,0 -12,-8';
    Blockly.BlockSvg.TAB_HEIGHT *= 2;
    Blockly.BlockSvg.TAB_WIDTH *= 2;
    Blockly.BlockSvg.NOTCH_WIDTH *= 2;
    */
    
    ocargo.blocklyControl.IMAGE_WIDTH *= 2;
    ocargo.blocklyControl.BLOCK_HEIGHT *= 2;

	document.styleSheets[0].insertRule(".blocklyText, .beaconClass" + ' { font-size' + ':'+'22pt !important'+'}', document.styleSheets[0].cssRules.length);
	document.styleSheets[0].insertRule(".blocklyIconMark, .beaconClass" + ' { font-size' + ':'+'18pt !important'+'}', document.styleSheets[0].cssRules.length);
	var blocks = Blockly.mainWorkspace.getAllBlocks();
    ocargo.blocklyControl.resetWidthOnBlocks(blocks);
    Blockly.mainWorkspace.render();

	Blockly.mainWorkspace.flyout_.show(Blockly.languageTree.childNodes);
	
    $(".blocklyIconShield").attr("width", 32).attr("height", 32).attr("rx", 8).attr("ry", 8);
    $(".blocklyIconMark").attr("x", 16).attr("y", 24);
    $(".blocklyEditableText > rect").attr("height", 32).attr("y", -24);
};

ocargo.BlocklyControl.prototype.decreaseBlockSize = function(){
	ocargo.blocklyControl.bigCodeMode = false;
    Blockly.BlockSvg.FIELD_HEIGHT /= 2;
    Blockly.BlockSvg.MIN_BLOCK_Y /= 2;
    Blockly.BlockSvg.JAGGED_TEETH_HEIGHT /= 2;
    Blockly.BlockSvg.JAGGED_TEETH_WIDTH /= 2;
    Blockly.BlockSvg.SEP_SPACE_X /= 2;
    Blockly.BlockSvg.SEP_SPACE_Y /= 2;
    Blockly.BlockSvg.INLINE_PADDING_Y /= 2;
    Blockly.Icon.RADIUS /= 2;
    
    /*Blockly.BlockSvg.NOTCH_PATH_LEFT = 'l 12,8 6,0 12,-8';
    Blockly.BlockSvg.NOTCH_PATH_LEFT_HIGHLIGHT = 'l 13,4 4,0 13,-8';
    Blockly.BlockSvg.NOTCH_PATH_RIGHT = 'l -12,4 -6,0 -12,-8';
    Blockly.BlockSvg.TAB_HEIGHT /= 2;
    Blockly.BlockSvg.TAB_WIDTH /= 2;
    Blockly.BlockSvg.NOTCH_WIDTH /= 2;
    */
    
    ocargo.blocklyControl.IMAGE_WIDTH /= 2;
    ocargo.blocklyControl.BLOCK_HEIGHT /= 2;

    var sheet = document.styleSheets[0];
	for(var i = 0; i < 2; i++){
	    sheet.deleteRule(sheet.cssRules.length-1);
	}

	var blocks = Blockly.mainWorkspace.getAllBlocks();
    ocargo.blocklyControl.resetWidthOnBlocks(blocks);
    Blockly.mainWorkspace.render();

	Blockly.mainWorkspace.flyout_.show(Blockly.languageTree.childNodes);
    $(".blocklyIconShield").attr("width", 16).attr("height", 16).attr("rx", 4).attr("ry", 4);
    $(".blocklyIconMark").attr("x", 8).attr("y", 12);
    $(".blocklyEditableText > rect").attr("height", 16).attr("y", -12);
};

/************************/
/** Block highlighting **/
/************************/

// Define custom select methods that select a block and its inputs
ocargo.BlocklyControl.prototype.setBlockSelected = function(block, selected) {
    if (!block.svg_) {
        return;
    }

    block.inputList.forEach(function(input) {
        if (input.connection && input.type !== Blockly.NEXT_STATEMENT) {
            var targetBlock = input.connection.targetBlock();
            if (targetBlock) {
                ocargo.blocklyControl.setBlockSelected(targetBlock, selected);
            }
        }
    });

    if (selected) {
        block.svg_.addSelect();
    } else {
        block.svg_.removeSelect();
    }
}

ocargo.BlocklyControl.prototype.clearAllSelections = function() {
    Blockly.mainWorkspace.getAllBlocks().forEach(
        function (block) {
            ocargo.blocklyControl.setBlockSelected(block, false);
        }
    );
}

ocargo.BlocklyControl.prototype.highlightIncorrectBlock = function(incorrectBlock) {
    var blocklyControl = this;
    var frequency = 300;
    var repeats = 3;

    this.incorrectBlock = incorrectBlock;
    this.incorrectBlockColour = incorrectBlock.getColour();

    incorrectBlock.setColour(0);
    for (var i = 0; i < repeats; i++) {
        window.setTimeout(function() { blocklyControl.setBlockSelected(incorrectBlock, true); }, 2 * i * frequency);
        window.setTimeout(function() { blocklyControl.setBlockSelected(incorrectBlock, false); }, (2 * i + 1) * frequency);
    }
};

ocargo.BlocklyControl.prototype.resetIncorrectBlock = function() {
    if (this.incorrectBlock) {
        this.incorrectBlock.setColour(ocargo.blocklyControl.incorrectBlockColour);
    }
}


ocargo.BlockHandler = function(id) {
    this.id = id;
    this.selectedBlock = null;
};

ocargo.BlockHandler.prototype.selectBlock = function(block) {
    if (block) {
        this.deselectCurrent();
        ocargo.blocklyControl.setBlockSelected(block, true);
        this.selectedBlock = block;
    }
};

ocargo.BlockHandler.prototype.deselectCurrent = function() {
    if (this.selectedBlock) {
        ocargo.blocklyControl.setBlockSelected(this.selectedBlock, false);
        this.selectedBlock = null;
    }
};