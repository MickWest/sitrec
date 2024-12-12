import { par } from "../par";
import { NodeMan, Sit } from "../Globals";
import { CNode } from "./CNode";

export class CNodeFrameSlider extends CNode {
    constructor(v) {
        super(v);
        this.sliderDiv = null;
        this.sliderInput = null;
        this.playPauseButton = null;
        this.startButton = null;
        this.endButton = null;
        this.frameAdvanceButton = null;
        this.frameBackButton = null;
        this.fastForwardButton = null;
        this.fastRewindButton = null;
        this.pinButton = null;

        this.pinned = false;
        this.advanceHeld = false;
        this.backHeld = false;
        this.advanceHoldFrames = 0;
        this.backHoldFrames = 0;
        this.holdThreshold = 10; // Number of frames the button needs to be held before starting repeated actions

        this.setupFrameSlider();
    }

    setupFrameSlider() {
        const sliderContainer = document.createElement('div');

        // Set up the slider container
        sliderContainer.style.position = 'absolute';
        sliderContainer.style.height = '40px';
        sliderContainer.style.bottom = '0px';
        if (process.env.BANNER_ACTIVE) {
            sliderContainer.style.bottom = process.env.BANNER_HEIGHT + 'px';
        }
        sliderContainer.style.width = '100%';
        sliderContainer.style.zIndex = '1001'; // Needed to get mouse events when over other windows
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';

        // Prevent double click behavior on the slider container
        sliderContainer.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        // Create control buttons container
        this.controlContainer = document.createElement('div');
        this.controlContainer.style.display = 'flex';
        this.controlContainer.style.marginRight = '10px';
        this.controlContainer.style.width = '400px'; // Adjusted width to accommodate the new buttons

        // Create Buttons
        this.pinButton = this.createButton(
            this.controlContainer,
            spriteLocations.pin.row,
            spriteLocations.pin.col,
            this.togglePin.bind(this),
            'Pin/Unpin'
        );

        this.togglePin();

        this.playPauseButton = this.createButton(
            this.controlContainer,
            spriteLocations.play.row,
            spriteLocations.play.col,
            this.togglePlayPause.bind(this),
            'Play/Pause'
        );
        this.updatePlayPauseButton();

        this.frameBackButton = this.createButton(
            this.controlContainer,
            spriteLocations.frameBack.row,
            spriteLocations.frameBack.col,
            this.backOneFrame.bind(this),
            'Step Back',
            () => {
                this.backHeld = true;
                this.backHoldFrames = 0; // Reset the hold count on mouse down
            },
            () => {
                this.backHeld = false;
                this.backHoldFrames = 0; // Clear the hold count on mouse up
            }
        );

        this.frameAdvanceButton = this.createButton(
            this.controlContainer,
            spriteLocations.frameAdvance.row,
            spriteLocations.frameAdvance.col,
            this.advanceOneFrame.bind(this),
            'Step Forward',
            () => {
                this.advanceHeld = true;
                this.advanceHoldFrames = 0; // Reset the hold count on mouse down
            },
            () => {
                this.advanceHeld = false;
                this.advanceHoldFrames = 0; // Clear the hold count on mouse up
            }
        );

        this.fastRewindButton = this.createButton(
            this.controlContainer,
            spriteLocations.fastRewind.row,
            spriteLocations.fastRewind.col,
            () => {},
            'Fast Rewind',
            () => {
                this.fastRewindButton.held = true;
                par.paused = true;
                this.updatePlayPauseButton();
            },
            () => {
                this.fastRewindButton.held = false;
            }
        );

        this.fastForwardButton = this.createButton(
            this.controlContainer,
            spriteLocations.fastForward.row,
            spriteLocations.fastForward.col,
            () => {},
            'Fast Forward',
            () => {
                this.fastForwardButton.held = true;
                par.paused = true;
                this.updatePlayPauseButton();
            },
            () => {
                this.fastForwardButton.held = false;
            }
        );

        this.startButton = this.createButton(
            this.controlContainer,
            spriteLocations.start.row,
            spriteLocations.start.col,
            () => this.setFrame(0),
            'Jump to Start'
        );

        this.endButton = this.createButton(
            this.controlContainer,
            spriteLocations.end.row,
            spriteLocations.end.col,
            () => this.setFrame(parseInt(this.sliderInput.max, 10)),
            'Jump to End'
        );

        this.controlContainer.style.opacity = "0"; // Initially hidden
        sliderContainer.appendChild(this.controlContainer);

        // Create the slider input element
        this.sliderInput = document.createElement('input');
        this.sliderInput.type = "range";
        this.sliderInput.className = "flat-slider";
        this.sliderInput.style.position = 'absolute';
        this.sliderInput.style.top = '0';
        this.sliderInput.style.left = '0';
        this.sliderInput.style.width = '100%';
        this.sliderInput.style.height = '100%';
        this.sliderInput.min = "0";
        this.sliderInput.max = "100"; // Initial max, can be updated later
        this.sliderInput.value = "0";

        let sliderDragging = false;
        let sliderFade = false;

        const newFrame = (frame) => {
            par.frame = frame;
            par.renderOne = true;
        };

        const getFrameFromSlider = () => {
            const frame = parseInt(this.sliderInput.value, 10);
            newFrame(frame);
        };

        // create a div to hold the slider
        this.sliderDiv = document.createElement('div');
        this.sliderDiv.style.width = '100%';
        this.sliderDiv.style.height = '40px';
        this.sliderDiv.style.display = 'flex';
        this.sliderDiv.style.alignItems = 'center';
        this.sliderDiv.style.justifyContent = 'center';
        this.sliderDiv.style.position = 'relative';
        this.sliderDiv.style.zIndex = '1002';
        this.sliderDiv.style.opacity = "0"; // Initially hidden
        this.sliderDiv.style.transition = "opacity 0.2s";


        this.sliderDiv.appendChild(this.sliderInput);
        sliderContainer.appendChild(this.sliderDiv);
        document.body.appendChild(sliderContainer);

        // add a canvas to the slider div
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1003'; // Ensure it overlays the input
        this.canvas.style.pointerEvents = 'none'; // Allow mouse events to pass through
        this.sliderDiv.appendChild(this.canvas);
        // get the context
        const ctx = this.canvas.getContext('2d');
        // red line
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        // draw a test line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.stroke();


        // Event listeners for slider interactions
        this.sliderInput.addEventListener('input', () => {
            newFrame(parseInt(this.sliderInput.value, 10));
            sliderDragging = true;
            par.paused = true;
        });

        this.sliderInput.addEventListener('change', () => {
            if (sliderFade) {
                this.sliderInput.style.opacity = "1";
                setTimeout(() => { this.sliderInput.style.opacity = "0"; }, 200); // fade out
                sliderFade = false;
            }
            sliderDragging = false;
        });

        this.sliderInput.style.opacity = "0"; // Initially hidden

        sliderContainer.addEventListener('mouseenter', () => {
            console.log("Hover Start");
            if (!sliderDragging) {
                setTimeout(() => { this.sliderDiv.style.opacity = "1"; }, 200); // fade in
                setTimeout(() => { this.sliderInput.style.opacity = "1"; }, 200); // fade in
                setTimeout(() => { this.controlContainer.style.opacity = "1"; }, 200); // fade in
                this.sliderFadeOutCounter = undefined; // Reset fade counter on mouse enter
            }
            sliderFade = false;
        });

        sliderContainer.addEventListener('mouseleave', () => {
            if (sliderDragging) {
                sliderFade = true;
            } else {
                this.sliderFadeOutCounter = 0; // Start fade counter on mouse leave
            }
        });
    }

    dispose() {
        super.dispose()
        // safely remove the slider
        this.sliderDiv.remove();


    }

    createButton(container, row, column, clickHandler, title, mouseDownHandler = null, mouseUpHandler = null) {
        const buttonContainer = this.createButtonContainer();
        const button = this.createSpriteDiv(row, column, clickHandler);
        button.title = title;
        buttonContainer.appendChild(button);
        container.appendChild(buttonContainer);

        if (mouseDownHandler) {
            button.addEventListener('mousedown', mouseDownHandler);
        }
        if (mouseUpHandler) {
            button.addEventListener('mouseup', mouseUpHandler);
        }

        return button;
    }

    update(frame) {
        // If pinned, ensure the bar stays visible
        if (this.pinned) {
            this.sliderDiv.style.opacity = "1";
            this.sliderInput.style.opacity = "1";
            this.controlContainer.style.opacity = "1";
            this.sliderFadeOutCounter = undefined;
        } else {

            // Called every frame
            if (this.sliderFadeOutCounter !== undefined && this.sliderFadeOutCounter < 100) {
                this.sliderFadeOutCounter++;
                if (this.sliderFadeOutCounter >= 70) {
                    const fadeProgress = (this.sliderFadeOutCounter - 70) / 30;
                    this.sliderInput.style.opacity = `${1 - fadeProgress}`;
                    this.sliderDiv.style.opacity = `${1 - fadeProgress}`;
                    this.controlContainer.style.opacity = `${1 - fadeProgress}`;
                }
            }

            if (this.sliderFadeOutCounter >= 100) {
                this.sliderDiv.style.opacity = "0";
                this.sliderInput.style.opacity = "0";
                this.controlContainer.style.opacity = "0";
                this.sliderFadeOutCounter = undefined;
            }
        }

        if (this.advanceHeld) {
            this.advanceHoldFrames++;
            if (this.advanceHoldFrames > this.holdThreshold) {
                this.advanceOneFrame();
            }
        }

        if (this.backHeld) {
            this.backHoldFrames++;
            if (this.backHoldFrames > this.holdThreshold) {
                this.backOneFrame();
            }
        }

        if (this.fastForwardButton && this.fastForwardButton.held) {
            par.frame = Math.min(parseInt(par.frame, 10) + 10, parseInt(this.sliderInput.max, 10));
        }

        if (this.fastRewindButton && this.fastRewindButton.held) {
            par.frame = Math.max(parseInt(par.frame, 10) - 10, 0);
        }

        // resize the canvas to the actualy pixels of the div
        const ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;


        // draw vertical line at Sit.aFrame,
        // green, one pixel wide
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.canvas.width * Sit.aFrame / Sit.frames, 0);
        ctx.lineTo(this.canvas.width * Sit.aFrame / Sit.frames, this.canvas.height);
        ctx.stroke();

        // and a red one for Sit.bFrame
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.canvas.width * Sit.bFrame / Sit.frames, 0);
        ctx.lineTo(this.canvas.width * Sit.bFrame / Sit.frames, this.canvas.height);
        ctx.stroke();


    }

    updateFrameSlider() {
        if (this.sliderInput.style.opacity === "1") {
            const currentValue = parseInt(this.sliderInput.value, 10);
            if (currentValue !== par.frame) {
                this.sliderInput.value = par.frame;
            }

            const max = parseInt(this.sliderInput.max, 10);
            if (max !== Sit.frames) {
                this.sliderInput.max = Sit.frames;
            }
        }
    }

    // Utility function to create a div using a sprite from a sprite sheet
    createSpriteDiv(row, column, onClickHandler) {
        const div = document.createElement('div');
        div.style.width = '40px';
        div.style.height = '40px';
        div.style.backgroundImage = 'url(./data/images/video-sprites-40px-5x3.png?v=1)';
        div.style.backgroundSize = '200px 120px'; // Updated to match the actual sprite sheet size
        div.style.backgroundPosition = `-${column * 40}px -${row * 40}px`; // Corrected to reflect sprite size in 200x120 image
        div.style.backgroundRepeat = 'no-repeat'; // Ensure only one sprite is displayed
        div.style.cursor = 'pointer';
        div.addEventListener('click', onClickHandler);
        return div;
    }

    // Utility function to create a button container
    createButtonContainer() {
        const container = document.createElement('div');
        container.style.width = '40px';
        container.style.height = '40px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        return container;
    }

    // Function to update the play/pause button based on the state of par.paused
    updatePlayPauseButton() {
        if (par.paused) {
            this.playPauseButton.style.backgroundPosition = `-${spriteLocations.play.col * 40}px -${spriteLocations.play.row * 40}px`;
        } else {
            this.playPauseButton.style.backgroundPosition = `-${spriteLocations.pause.col * 40}px -${spriteLocations.pause.row * 40}px`;
        }
    }

    // Play/Pause toggle function
    togglePlayPause() {
        par.paused = !par.paused;
        this.updatePlayPauseButton();
    }

    // Pin/Unpin toggle function
    togglePin() {
        this.pinned = !this.pinned;
        this.pinButton.style.backgroundPosition = this.pinned ? `-${spriteLocations.unpin.col * 40}px -${spriteLocations.unpin.row * 40}px` : `-${spriteLocations.pin.col * 40}px -${spriteLocations.pin.row * 40}px`;
    }

    // Advance a single frame function
    advanceOneFrame() {
        par.paused = true;
        this.updatePlayPauseButton()
        let currentFrame = parseInt(this.sliderInput.value, 10);
        if (currentFrame < parseInt(this.sliderInput.max, 10)) {
            this.setFrame(currentFrame + 1);
        }
    }

    // Back a single frame function
    backOneFrame() {
        par.paused = true;
        this.updatePlayPauseButton()
        let currentFrame = parseInt(this.sliderInput.value, 10);
        if (currentFrame > 0) {
            this.setFrame(currentFrame - 1);
        }
    }

    // Set frame helper function
    setFrame(frame) {
        this.sliderInput.value = frame;
        par.frame = frame;
    }
}

// Define the sprite locations by button name
const spriteLocations = {
    play: { row: 0, col: 0 }, // Play button
    pause: { row: 0, col: 1 }, // Pause button
    frameBack: { row: 1, col: 3 }, // Step one frame back
    frameAdvance: { row: 1, col: 2 }, // Step one frame forward
    start: { row: 1, col: 1 }, // Jump to start
    end: { row: 1, col: 0 }, // Jump to end
    fastRewind: { row: 2, col: 1 }, // Fast rewind
    fastForward: { row: 2, col: 0 }, // Fast forward
    pin: { row: 2, col: 2 }, // Pin button
    unpin: { row: 2, col: 3 } // Unpin button
};

// Exported function to create an instance of CNodeFrameSlider
export function SetupFrameSlider() {
    return new CNodeFrameSlider({ id: "FrameSlider" });
}

export function updateFrameSlider() {
    const slider = NodeMan.get("FrameSlider");
    slider.updateFrameSlider();
    slider.updatePlayPauseButton();
}
