import { par } from "../par";
import { NodeMan, Sit } from "../Globals";
import { CNode } from "./CNode";

export class CNodeFrameSlider extends CNode {
    constructor(v) {
        super(v);
        this.sliderDiv = null;
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

        // Pin Button
        const pinContainer = this.createButtonContainer();
        this.pinButton = this.createSpriteDiv(spriteLocations.pin.row, spriteLocations.pin.col, this.togglePin.bind(this));
        this.pinButton.title = 'Pin/Unpin';
        pinContainer.appendChild(this.pinButton);
        this.controlContainer.appendChild(pinContainer);

        // Play/Pause Button
        const playPauseContainer = this.createButtonContainer();
        this.playPauseButton = this.createSpriteDiv(spriteLocations.play.row, spriteLocations.play.col, this.togglePlayPause.bind(this));
        this.playPauseButton.title = 'Play/Pause';
        playPauseContainer.appendChild(this.playPauseButton);
        this.controlContainer.appendChild(playPauseContainer);
        this.updatePlayPauseButton();

        // Single Frame Back Button
        const frameBackContainer = this.createButtonContainer();
        this.frameBackButton = this.createSpriteDiv(spriteLocations.frameBack.row, spriteLocations.frameBack.col, this.backOneFrame.bind(this));
        this.frameBackButton.title = 'Step Back';
        frameBackContainer.appendChild(this.frameBackButton);
        this.controlContainer.appendChild(frameBackContainer);

        // Handle back button hold
        this.frameBackButton.addEventListener('mousedown', () => {
            this.backHeld = true;
            this.backHoldFrames = 0; // Reset the hold count on mouse down
        });

        this.frameBackButton.addEventListener('mouseup', () => {
            this.backHeld = false;
            this.backHoldFrames = 0; // Clear the hold count on mouse up
        });

        // Single Frame Advance Button
        const frameAdvanceContainer = this.createButtonContainer();
        this.frameAdvanceButton = this.createSpriteDiv(spriteLocations.frameAdvance.row, spriteLocations.frameAdvance.col, this.advanceOneFrame.bind(this));
        this.frameAdvanceButton.title = 'Step Forward';
        frameAdvanceContainer.appendChild(this.frameAdvanceButton);
        this.controlContainer.appendChild(frameAdvanceContainer);

        // Handle advance button hold
        this.frameAdvanceButton.addEventListener('mousedown', () => {
            this.advanceHeld = true;
            this.advanceHoldFrames = 0; // Reset the hold count on mouse down
        });

        this.frameAdvanceButton.addEventListener('mouseup', () => {
            this.advanceHeld = false;
            this.advanceHoldFrames = 0; // Clear the hold count on mouse up
        });

        // Fast Rewind Button
        const fastRewindContainer = this.createButtonContainer();
        this.fastRewindButton = this.createSpriteDiv(spriteLocations.fastRewind.row, spriteLocations.fastRewind.col, () => {});
        this.fastRewindButton.title = 'Fast Rewind';
        fastRewindContainer.appendChild(this.fastRewindButton);
        this.controlContainer.appendChild(fastRewindContainer);

        // Handle fast rewind button hold
        this.fastRewindButton.addEventListener('mousedown', () => {
            this.fastRewindButton.held = true;
            par.paused = true;
            this.updatePlayPauseButton();
        });

        this.fastRewindButton.addEventListener('mouseup', () => {
            this.fastRewindButton.held = false;
        });

        // Fast Forward Button
        const fastForwardContainer = this.createButtonContainer();
        this.fastForwardButton = this.createSpriteDiv(spriteLocations.fastForward.row, spriteLocations.fastForward.col, () => {});
        this.fastForwardButton.title = 'Fast Forward';
        fastForwardContainer.appendChild(this.fastForwardButton);
        this.controlContainer.appendChild(fastForwardContainer);

        // Handle fast forward button hold
        this.fastForwardButton.addEventListener('mousedown', () => {
            this.fastForwardButton.held = true;
            par.paused = true;
            this.updatePlayPauseButton();
        });

        this.fastForwardButton.addEventListener('mouseup', () => {
            this.fastForwardButton.held = false;
        });

        // Start Button (Jump to start)
        const startContainer = this.createButtonContainer();
        this.startButton = this.createSpriteDiv(spriteLocations.start.row, spriteLocations.start.col, () => this.setFrame(0));
        this.startButton.title = 'Jump to Start';
        startContainer.appendChild(this.startButton);
        this.controlContainer.appendChild(startContainer);

        // End Button (Jump to end)
        const endContainer = this.createButtonContainer();
        this.endButton = this.createSpriteDiv(spriteLocations.end.row, spriteLocations.end.col, () => this.setFrame(parseInt(this.sliderDiv.max, 10)));
        this.endButton.title = 'Jump to End';
        endContainer.appendChild(this.endButton);
        this.controlContainer.appendChild(endContainer);

        this.controlContainer.style.opacity = "0"; // Initially hidden
        sliderContainer.appendChild(this.controlContainer);

        // Create the slider input element
        this.sliderDiv = document.createElement('input');
        this.sliderDiv.type = "range";
        this.sliderDiv.className = "flat-slider";
        this.sliderDiv.style.flexGrow = '1';
        this.sliderDiv.min = "0";
        this.sliderDiv.max = "100"; // Initial max, can be updated later
        this.sliderDiv.value = "0";

        let sliderDragging = false;
        let sliderFade = false;

        const newFrame = (frame) => {
            par.frame = frame;
            par.renderOne = true;
        };

        const getFrameFromSlider = () => {
            const frame = parseInt(this.sliderDiv.value, 10);
            newFrame(frame);
        };

        sliderContainer.appendChild(this.sliderDiv);
        document.body.appendChild(sliderContainer);

        // Event listeners for slider interactions
        this.sliderDiv.addEventListener('input', () => {
            newFrame(parseInt(this.sliderDiv.value, 10));
            sliderDragging = true;
            par.paused = true;
        });

        this.sliderDiv.addEventListener('change', () => {
            if (sliderFade) {
                this.sliderDiv.style.opacity = "1";
                setTimeout(() => { this.sliderDiv.style.opacity = "0"; }, 200); // fade out
                sliderFade = false;
            }
            sliderDragging = false;
        });

        this.sliderDiv.style.opacity = "0"; // Initially hidden

        sliderContainer.addEventListener('mouseenter', () => {
            console.log("Hover Start");
            if (!sliderDragging) {
                this.sliderDiv.style.opacity = "0";
                setTimeout(() => { this.sliderDiv.style.opacity = "1"; }, 200); // fade in
                this.controlContainer.style.opacity = "0";
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

    update(frame) {
        // If pinned, ensure the bar stays visible
        if (this.pinned) {
            this.sliderDiv.style.opacity = "1";
            this.controlContainer.style.opacity = "1";
            this.sliderFadeOutCounter = undefined;
        } else {

            // Called every frame
            if (this.sliderFadeOutCounter !== undefined && this.sliderFadeOutCounter < 100) {
                this.sliderFadeOutCounter++;
                if (this.sliderFadeOutCounter >= 70) {
                    const fadeProgress = (this.sliderFadeOutCounter - 70) / 30;
                    this.sliderDiv.style.opacity = `${1 - fadeProgress}`;
                    this.controlContainer.style.opacity = `${1 - fadeProgress}`;
                }
            }

            if (this.sliderFadeOutCounter >= 100) {
                this.sliderDiv.style.opacity = "0";
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
            par.frame = Math.min(parseInt(par.frame, 10) + 10, parseInt(this.sliderDiv.max, 10));
        }

        if (this.fastRewindButton && this.fastRewindButton.held) {
            par.frame = Math.max(parseInt(par.frame, 10) - 10, 0);
        }
    }

    updateFrameSlider() {
        if (this.sliderDiv.style.opacity === "1") {
            const currentValue = parseInt(this.sliderDiv.value, 10);
            if (currentValue !== par.frame) {
                this.sliderDiv.value = par.frame;
            }

            const max = parseInt(this.sliderDiv.max, 10);
            if (max !== Sit.frames) {
                this.sliderDiv.max = Sit.frames;
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
        let currentFrame = parseInt(this.sliderDiv.value, 10);
        if (currentFrame < parseInt(this.sliderDiv.max, 10)) {
            this.setFrame(currentFrame + 1);
        }
    }

    // Back a single frame function
    backOneFrame() {
        par.paused = true;
        this.updatePlayPauseButton()
        let currentFrame = parseInt(this.sliderDiv.value, 10);
        if (currentFrame > 0) {
            this.setFrame(currentFrame - 1);
        }
    }

    // Set frame helper function
    setFrame(frame) {
        this.sliderDiv.value = frame;
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
    NodeMan.get("FrameSlider").updateFrameSlider();
}
