Ext.define('Ext.ux.Intro', {

    mixins: {
        observable: 'Ext.util.Observable'
    },

    config: {
        /* steps array in format:
         {
            element: ,
            intro: ,
            tooltipClass: ,
            position:
         }
        */
        steps: null,
        url: null,
        /* Default tooltip box position */
        tooltipPosition: 'bottom',
        /* Next CSS class for tooltip boxes */
        tooltipClass: '',
        /* Close introduction when pressing Escape button? */
        exitOnEsc: true,
        /* Close introduction when clicking on overlay layer? */
        exitOnOverlayClick: true,
        /* Show step numbers in introduction? */
        showStepNumbers: true,
        /* Let user use keyboard to navigate the tour? */
        keyboardNavigation: true,
        /* Show tour control buttons? */
        showButtons: true,
        /* Show tour bullets? */
        showBullets: true,
        /* Scroll to highlighted element? */
        scrollToElement: true
    },
    /* {Ext.dom.Element} */
    targetEl: null,
    /* {Ext.dom.Element} */
    helperEl: null,

    /* Next button label in tooltip box */
    nextLabel: 'Next &rarr;',
    /* Previous button label in tooltip box */
    prevLabel: '&larr; Back',
    /* Skip button label in tooltip box */
    skipLabel: 'Skip',
    /* Done button label in tooltip box */
    doneLabel: 'Done',

    _introItems: null,

    _currentStep: -1,

    constructor: function(config) {
        this.initConfig(config);

        this.mixins.observable.constructor.call(this, config);

        this.addEvents(
            'beforestep',
            'step',
            'finish'
        );

        return this;
    },

    init: function() {
        var allIntroSteps, stepsLength, currentItem, currentElement, elmsLength, floatingElementQuery,
            step, i;
        var introItems = [];

        if (!this.targetEl) {
            this.targetEl = Ext.getBody();
        }

        if (this.steps) {
            for (i = 0, stepsLength = this.steps.length; i < stepsLength; i++) {
                currentItem = Ext.clone(this.steps[i]);
                //set the step
                currentItem.step = introItems.length + 1;
                //use querySelector function only when developer used CSS selector
                if (typeof(currentItem.element) === 'string') {
                    //grab the element with given selector from the page
                    currentItem.element = Ext.get(currentItem.element);
                }

                //intro without element
                if (!currentItem.element) {
                    floatingElementQuery = Ext.getBody().down(".introjsFloatingElement");

                    if (!floatingElementQuery) {
                        floatingElementQuery = document.createElement('div');
                        floatingElementQuery.className = 'introjsFloatingElement';

                        document.body.appendChild(floatingElementQuery);
                        floatingElementQuery = Ext.get(floatingElementQuery);
                    }

                    currentItem.element  = floatingElementQuery;
                    currentItem.position = 'floating';
                }

                if (currentItem.element) {
                    introItems.push(currentItem);
                }
            }
        } else if (this.url) {
            Ext.Ajax.request({
                url: this.url,
                scope: this,
                success: function(response) {
                    this.steps = Ext.decode(response.responseText);
                    this.start();
                }
            });
            return false;
        } else {
            //use steps from data-* annotations
            allIntroSteps = this.targetEl.query('*[data-intro]');
            //if there's no element to intro
            if (allIntroSteps.length < 1) {
                return false;
            }

            //first add intro items with data-step
            for (i = 0, elmsLength = allIntroSteps.length; i < elmsLength; i++) {
                currentElement = allIntroSteps[i];
                step = parseInt(currentElement.getAttribute('data-step'), 10);
                if (step === null) {
                    step = i;
                }

                if (step > 0) {
                    introItems[step - 1] = {
                        element: currentElement,
                        intro: currentElement.getAttribute('data-intro'),
                        step: step,
                        tooltipClass: currentElement.getAttribute('data-tooltipClass'),
                        position: currentElement.getAttribute('data-position') || this.tooltipPosition
                    };
                }
            }
        }

        //Ok, sort all items with given steps
        introItems.sort(function (a, b) {
            return a.step - b.step;
        });

        //set it to the introJs object
        this._introItems = introItems;
        return true;
    },

    start: function() {
        if (!this._introItems) {
            if (!this.init()) {
                return this;
            }
        }

        //add overlay layer to the page
        if(this.addOverlayLayer()) {
            //then, start the show
            this.goToStep(0);

            var win = Ext.fly(window);
            win.on('keydown', this.onKeyDown, this);
            win.on('resize', this.onResize, this);
        }
        return this;
    },

    /**
     * Go to specific step of introduction
     *
     * @api private
     * @method _goToStep
     */
    goToStep: function(step) {
        if ((this._introItems.length) <= step) {
            //end of the intro
            this.exitIntro();
            return this;
        }

        var curStep = this._introItems[step];
        if (this.fireEvent('beforestep', this._introItems[this._currentStep], curStep, step)) {
            //because steps starts with zero
            this._currentStep = step;
            this.showElement(curStep);
            this.fireEvent('step', curStep, step)
        }
        return this;
    },

    /**
     * Go to next step on intro
     *
     * @api private
     * @method nextStep
     */
    nextStep: function() {
        return this.goToStep(this._currentStep + 1);
    },

    /**
     * Go to previous step on intro
     *
     * @api private
     * @method nextStep
     */
    previousStep: function() {
        return this.goToStep(this._currentStep - 1);
    },

    /**
     * Exit from intro
     *
     * @api private
     * @method exitIntro
     */
    exitIntro: function () {
        //remove overlay layer from the page
        //return if intro already completed or skipped
        if (!this.overlayEl) {
            return;
        }

        //for fade-out animation
        this.overlayEl.fadeOut({ opacity: 0, duration: 500});
        this.overlayEl = null;

        //remove all helper layers
        if (this.helperEl) {
            this.helperEl.remove();
            this.helperEl = null;
        }

        //remove intro floating element
        var floatingElement = Ext.fly('.introjsFloatingElement');
        if (floatingElement) {
            floatingElement.remove();
        }

        //remove `introjs-showElement` class from the element
        var showElement = Ext.getBody().down('.introjs-showElement');
        if (showElement) {
            showElement = showElement.dom;
            showElement.className = showElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, ''); // This is a manual trim.
        }

        //remove `introjs-fixParent` class from the elements
        var fixParents = Ext.query('.introjs-fixParent');
        if (fixParents && fixParents.length > 0) {
            for (var i = fixParents.length - 1; i >= 0; i--) {
                Ext.fly(fixParents[i]).removeCls('introjs-fixParent');
            }
        }

        var win = Ext.fly(window);
        win.un('keydown', this.onKeyDown, this);
        win.un('resize', this.onResize, this);

        //set the step to zero
        this._currentStep = -1;

        this.fireEvent('finish');
    },

    /**
     * Render tooltip box in the page
     *
     * @api private
     * @method _placeTooltip
     * @param {Object} targetElement
     * @param {Object} tooltipLayer
     * @param {Object} arrowLayer
     * @param {Object} helperNumberLayer
     */
    placeTooltip: function(targetElement) {
        //reset the old style
        var tooltipStyle = {
            top:        null,
            right:      null,
            bottom:     null,
            left:       null,
            marginLeft: null,
            marginTop:  null
        };
        var tooltipCssClass = '', currentStepObj, xy;


        this.arrowEl.setDisplayed('inherit');
        this.arrowEl.removeCls('bottom left right top');

        if (this.helperNumberEl) {
            this.helperNumberEl.setStyle({
                top: null,
                left: null
            });
        }

        //prevent error when `this._currentStep` is undefined
        if (!this._introItems[this._currentStep]) return;

        //if we have a custom css class for each step
        currentStepObj = this._introItems[this._currentStep];
        if (typeof (currentStepObj.tooltipClass) === 'string') {
            tooltipCssClass = currentStepObj.tooltipClass;
        } else {
            tooltipCssClass = this.tooltipClass;
        }

        this.tooltipEl.dom.className = ('introjs-tooltip ' + tooltipCssClass).replace(/^\s+|\s+$/g, '');

        var currentTooltipPosition = this._introItems[this._currentStep].position;
        switch (currentTooltipPosition) {
            case 'top':
                tooltipStyle.left = '15px';
                tooltipStyle.top = '-' + (this.getOffset(this.tooltipEl).height + 10) + 'px';
                this.arrowEl.addCls('bottom');
                break;
            case 'right':
                tooltipStyle.left = (this.getOffset(targetElement).width + 20) + 'px';
                this.arrowEl.addCls('left')
                break;
            case 'left':
                if (this.showStepNumbers === true) {
                    tooltipStyle.top = '15px';
                }
                tooltipStyle.right = (this.getOffset(targetElement).width + 20) + 'px';
                this.arrowEl.addCls('right')
                break;
            case 'floating':
                this.arrowEl.hide();

                //we have to adjust the top and left of layer manually for intro items without element{
                var tooltipOffset = this.getOffset(this.tooltipEl);

                tooltipStyle.left   = '50%';
                tooltipStyle.top    = '50%';
                tooltipStyle.marginLeft = '-' + (tooltipOffset.width / 2)  + 'px';
                tooltipStyle.marginTop  = '-' + (tooltipOffset.height / 2) + 'px';

                if (this.helperNumberEl) {
                    if (this.showStepNumbers !== 'tooltip') {
                        this.helperNumberEl.setStyle({
                            left: '-' + ((tooltipOffset.width / 2) + 18) + 'px',
                            top: '-' + ((tooltipOffset.height / 2) + 18) + 'px'
                        });
                    }
                }
                break;
            case 'bottom':
            // Bottom going to follow the default behavior
            default:
                tooltipStyle.bottom = '-' + (this.getOffset(this.tooltipEl).height + 10) + 'px';
                this.arrowEl.addCls('introjs-arrow top');
                break;
        }
        this.tooltipEl.setStyle(tooltipStyle);
    },

    /**
     * Add overlay layer to the page
     *
     * @api private
     * @method _addOverlayLayer
     * @param {Object} targetElm
     */
    addOverlayLayer: function() {
        var styleText = '', elementPosition;
        //check if the target element is body, we should calculate the size of overlay layer in a better way
        if (this.targetEl.dom.tagName.toLowerCase() === 'body') {
            styleText = 'top: 0;bottom: 0; left: 0;right: 0;position: fixed;';
        } else {
            //set overlay layer position
            elementPosition = this.getOffset(this.targetEl);
            if (elementPosition) {
                styleText = 'width: ' + elementPosition.width + 'px; height:' + elementPosition.height + 'px; top:' + elementPosition.top + 'px;left: ' + elementPosition.left + 'px;';
            }
        }
        this.overlayEl = Ext.DomHelper.append(this.targetEl, '<div class="introjs-overlay" style="' + styleText + '">', true);

        if (this.exitOnOverlayClick == true) {
            this.overlayEl.on('click', function() {
                if (this.exitOnOverlayClick) {
                    this.exitIntro();
                }
            }, this);
        }

        Ext.Function.defer(function() {
            this.overlayEl.setOpacity(0.8);
        }, 10, this);
        return true;
    },

    /**
     * Update the position of the helper layer on the screen
     *
     * @api private
     * @method _setHelperLayerPosition
     * @param {Object} helperLayer
     */
    updateHelperLayerPosition: function () {
        if (this.helperEl) {
            //prevent error when `this._currentStep` in undefined
            if (!this._introItems[this._currentStep]) return;

            var currentElement  = this._introItems[this._currentStep];
            var elementPosition = this.getOffset(currentElement.element);

            var widthHeightPadding = 10;
            if (currentElement.position == 'floating') {
                widthHeightPadding = 0;
            }

            var domEl = this.helperEl.dom;

            //set new position to helper layer
            domEl.setAttribute('style', 'width: ' + (elementPosition.width  + widthHeightPadding)  + 'px; ' +
                'height:' + (elementPosition.height + widthHeightPadding)  + 'px; ' +
                'top:'    + (elementPosition.top    - 5)   + 'px;' +
                'left: '  + (elementPosition.left   - 5)   + 'px;');
        }
    },

    /**
     * Show an element on the page
     *
     * @api private
     * @method _showElement
     * @param {Object} targetElement
     */
    showElement: function(targetElement) {
        var self = this, i, stepsLength,
            ulContainer, innerLi, anchorLink, fixParents,
            dh = Ext.DomHelper;

        if (!this.helperEl) {
            this.helperEl       = Ext.get(document.createElement('div')),
            this.tooltipEl      = Ext.get(document.createElement('div')),
            this.tooltipTextEl  = Ext.get(document.createElement('div')),
            this.bulletsEl      = Ext.get(document.createElement('div')),
            this.buttonsEl      = Ext.get(document.createElement('div'));

            this.helperEl.addCls('introjs-helperLayer');
            this.tooltipTextEl.addCls('introjs-tooltiptext');
            this.bulletsEl.addCls('introjs-bullets');

            if (this.showBullets === false) {
                this.bulletsEl.hide();
            }

            ulContainer = document.createElement('ul');

            for (i = 0, stepsLength = this._introItems.length; i < stepsLength; i++) {
                innerLi    = document.createElement('li');
                anchorLink = document.createElement('a');

                anchorLink.onclick = function() {
                    self.goToStep(this.getAttribute('data-stepnumber'));
                };

                if (i === 0) anchorLink.className = "active";

                anchorLink.href = 'javascript:void(0);';
                anchorLink.innerHTML = "&nbsp;";
                anchorLink.setAttribute('data-stepnumber', this._introItems[i].step);

                innerLi.appendChild(anchorLink);
                ulContainer.appendChild(innerLi);
            }

            this.bulletsEl.appendChild(ulContainer);

            this.buttonsEl.addCls('introjs-tooltipbuttons');
            if (this.showButtons === false) {
                this.buttonsEl.hide();
            }

            this.tooltipEl.addCls('introjs-tooltip');
            this.tooltipEl.appendChild(this.tooltipTextEl);
            this.tooltipEl.appendChild(this.bulletsEl);
            this.arrowEl = dh.append(this.tooltipEl, '<div class="introjs-arrow"></div>', true);
            this.helperEl.appendChild(this.tooltipEl);

            //add helper layer number
            if (this.showStepNumbers) {
                this.helperNumberEl = dh.insertFirst(
                    this.showStepNumbers === 'tooltip' ? this.tooltipEl : this.helperEl,
                    '<span class="introjs-helperNumberLayer"></span>',
                    true
                );
            }

            //skip button
            this.skipTooltipButton = dh.append(this.buttonsEl,
                '<a href="javascript:void(0);" class="introjs-button introjs-skipbutton">' + this.skipLabel + '</a>',
                true
            );
            this.skipTooltipButton.on('click', function() {
                if (this._introItems.length - 1 == this._currentStep && typeof (this._introCompleteCallback) === 'function') {
                    this._introCompleteCallback.call(this);
                }

                if (this._introItems.length - 1 != this._currentStep && typeof (this._introExitCallback) === 'function') {
                    this._introExitCallback.call(this);
                }

                this.exitIntro();
            }, this);

            //in order to prevent displaying next/previous button always
            if (this._introItems.length > 1) {
                //previous button
                this.prevTooltipButton = dh.append(this.buttonsEl,
                    '<a href="javascript:void(0);" class="introjs-button introjs-prevbutton">' + this.prevLabel + '</a>',
                    true
                );
                this.prevTooltipButton.on('click', function() {
                    if (self._currentStep != 0) {
                        self.previousStep();
                    }
                }, this);

                //next button
                this.nextTooltipButton = dh.append(this.buttonsEl,
                    '<a href="javascript:void(0);" class="introjs-button introjs-nextbutton">' + this.nextLabel + '</a>',
                    true
                );
                this.nextTooltipButton.on('click', function() {
                    if (this._introItems.length - 1 != this._currentStep) {
                        this.nextStep();
                    }
                }, this);
            }

            this.tooltipEl.appendChild(this.buttonsEl);
            this.tooltipEl.hide();
            //add helper layer to target element
            this.targetEl.appendChild(this.helperEl);
        } else {
            this.tooltipEl.hide();
        }

        //set new position to helper layer
        this.updateHelperLayerPosition();

        //remove `introjs-fixParent` class from the elements
        fixParents = Ext.query('.introjs-fixParent');
        if (fixParents && fixParents.length > 0) {
            for (i = fixParents.length - 1; i >= 0; i--) {
                Ext.fly(fixParents[i]).removeCls('introjs-fixParent');
            }
        }

        //remove old classes
        var showEl = Ext.getBody().down('.introjs-showElement');
        if (showEl) {
            showEl.dom.className = showEl.dom.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, '');
        }

        //we should wait until the CSS3 transition is competed (it's 0.3 sec) to prevent incorrect `height` and `width` calculation
        if (!self._lastShowElTask) {
            self._lastShowElTask = new Ext.util.DelayedTask(function(targetElement) {
                //set current step to the label
                if (this.helperNumberEl) {
                    this.helperNumberEl.update(targetElement.step);
                    this.helperNumberEl.show();
                }

                if (targetElement.width) {
                    this.tooltipTextEl.setWidth(targetElement.width);
                } else {
                    this.tooltipTextEl.setWidth(null);
                }
                //set current tooltip text
                var text = targetElement.intro;
                if (Ext.isArray(text)) {
                    text = text.join('');
                }
                this.tooltipTextEl.update(text);

                //set the tooltip position
                self.placeTooltip(targetElement.element);

                if (this.bulletsEl) {
                    //change active bullet
                    this.bulletsEl.down('li > a.active').removeCls('active');
                    this.bulletsEl.down('li > a[data-stepnumber="' + targetElement.step + '"]').addCls('active');
                }

                //show the tooltip
                this.tooltipEl.show();
            }, this);
        }
        self._lastShowElTask.delay(350, null, null, [targetElement]);



        this.prevTooltipButton.removeCls('introjs-disabled');
        this.nextTooltipButton.removeCls('introjs-disabled');
        this.skipTooltipButton.update(this.skipLabel);
        if (this._currentStep === 0 && this._introItems.length > 1) {
            this.prevTooltipButton.addCls('introjs-disabled');
        } else if (this._introItems.length - 1 === this._currentStep || this._introItems.length === 1) {
            this.nextTooltipButton.addCls('introjs-disabled');
            this.skipTooltipButton.update(this.doneLabel);
        }

        //Set focus on "next" button, so that hitting Enter always moves you onto the next step
        this.nextTooltipButton.focus();

        //add target element position style
        targetElement.element.addCls('introjs-showElement');

        var currentElementPosition = targetElement.element.getStyle('position');
        if (currentElementPosition !== 'absolute' &&
            currentElementPosition !== 'relative') {
            //change to new intro item
            targetElement.element.addCls('introjs-relativePosition');
        }

        var parentElm = targetElement.element.parent();
        while (parentElm !== null) {
            if (parentElm.dom.tagName.toLowerCase() === 'body') break;

            //fix The Stacking Contenxt problem.
            //More detail: https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context
            var zIndex = parentElm.getStyle('z-index');
            var opacity = parseFloat(parentElm.getStyle('opacity'));
            if (/[0-9]+/.test(zIndex) || opacity < 1) {
                parentElm.addCls('introjs-fixParent');
            }

            parentElm = parentElm.parent();
        }

        if (!this.elementInViewport(targetElement.element) && this.scrollToElement === true) {
            var rect = targetElement.element.dom.getBoundingClientRect(),
                winHeight= this.getWinSize().height,
                top = rect.bottom - (rect.bottom - rect.top),
                bottom = rect.bottom - winHeight;

            //Scroll up
            if (top < 0 || targetElement.element.clientHeight > winHeight) {
                window.scrollBy(0, top - 30); // 30px padding from edge to look nice

                //Scroll down
            } else {
                window.scrollBy(0, bottom + 100); // 70px + 30px padding from edge to look nice
            }
        }
    },

    /**
     * Provides a cross-browser way to get the screen dimensions
     * via: http://stackoverflow.com/questions/5864467/internet-explorer-innerheight
     *
     * @api private
     * @method _getWinSize
     * @returns {Object} width and height attributes
     */
    getWinSize: function() {
        if (window.innerWidth) {
            return { width: window.innerWidth, height: window.innerHeight };
        } else {
            var D = document.documentElement;
            return { width: D.clientWidth, height: D.clientHeight };
        }
    },

    /**
     * Add overlay layer to the page
     * http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
     *
     * @api private
     * @method _elementInViewport
     * @param {Object} el
     */
    elementInViewport: function(el) {
        var rect = el.dom.getBoundingClientRect();
        var winSize = this.getWinSize();

        return (
            rect.top >= 0 &&
                rect.left >= 0 &&
                (rect.bottom+80) <= winSize.height && // add 80 to get the text right
                rect.right <= winSize.width
            );
    },

    /**
     * Get an element position on the page
     * Thanks to `meouw`: http://stackoverflow.com/a/442474/375966
     *
     * @api private
     * @method _getOffset
     * @param {Object} element
     * @returns {Object} Element's position info
     */
    getOffset: function(element) {
        var elementPosition = {};
        var _x = 0;
        var _y = 0;

        if (element.dom) {
            element = element.dom;
        }
        //set width
        elementPosition.width = element.offsetWidth;

        //set height
        elementPosition.height = element.offsetHeight;

        //calculate element top and left

        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
            _x += element.offsetLeft;
            _y += element.offsetTop;
            element = element.offsetParent;
        }
        //set top
        elementPosition.top = _y;
        //set left
        elementPosition.left = _x;

        return elementPosition;
    },

    onResize: function(e) {
        this.updateHelperLayerPosition();
    },

    onKeyDown: function(e) {
        var self = this;
        if (e.keyCode === 27 && self.exitOnEsc == true) {
            //escape key pressed, exit the intro
            self.exitIntro();
        } else if(e.keyCode === 37) {
            //left arrow
            self.previousStep();
        } else if (e.keyCode === 39 || e.keyCode === 13) {
            //right arrow or enter
            self.nextStep();
            //prevent default behaviour on hitting Enter, to prevent steps being skipped in some browsers
            if(e.preventDefault) {
                e.preventDefault();
            } else {
                e.returnValue = false;
            }
        }
    }
});