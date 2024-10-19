import { par } from "./par";
import { Sit } from "./Globals";

let sliderDiv, playPauseButton, startButton, endButton, frameAdvanceButton, frameBackButton;
let playInterval = null;

// Define the sprite locations by button name
const spriteLocations = {
    play: { row: 0, col: 0 }, // Play button
    pause: { row: 0, col: 1 }, // Pause button
    frameBack: { row: 1, col: 3 }, // Step one frame back
    frameAdvance: { row: 1, col: 2 }, // Step one frame forward
    start: { row: 1, col: 1 }, // Jump to start
    end: { row: 1, col: 0 } // Jump to end
};

// This is the slider at the bottom of the screen
export function SetupFrameSlider() {
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
    const controlContainer = document.createElement('div');
    controlContainer.style.display = 'flex';
    controlContainer.style.marginRight = '10px';
    controlContainer.style.width = '240px'; // Adjusted width to accommodate the new button

    // Play/Pause Button
    const playPauseContainer = createButtonContainer();
    playPauseButton = createSpriteDiv(spriteLocations.play.row, spriteLocations.play.col, togglePlayPause);
    playPauseContainer.appendChild(playPauseButton);
    controlContainer.appendChild(playPauseContainer);
    updatePlayPauseButton();

    // Single Frame Back Button
    const frameBackContainer = createButtonContainer();
    frameBackButton = createSpriteDiv(spriteLocations.frameBack.row, spriteLocations.frameBack.col, backOneFrame);
    frameBackContainer.appendChild(frameBackButton);
    controlContainer.appendChild(frameBackContainer);

    // Single Frame Advance Button
    const frameAdvanceContainer = createButtonContainer();
    frameAdvanceButton = createSpriteDiv(spriteLocations.frameAdvance.row, spriteLocations.frameAdvance.col, advanceOneFrame);
    frameAdvanceContainer.appendChild(frameAdvanceButton);
    controlContainer.appendChild(frameAdvanceContainer);

    // Start Button (Jump to start)
    const startContainer = createButtonContainer();
    startButton = createSpriteDiv(spriteLocations.start.row, spriteLocations.start.col, () => setFrame(0));
    startContainer.appendChild(startButton);
    controlContainer.appendChild(startContainer);

    // End Button (Jump to end)
    const endContainer = createButtonContainer();
    endButton = createSpriteDiv(spriteLocations.end.row, spriteLocations.end.col, () => setFrame(parseInt(sliderDiv.max, 10)));
    endContainer.appendChild(endButton);
    controlContainer.appendChild(endContainer);

    controlContainer.style.opacity = "0"; // Initially hidden
    sliderContainer.appendChild(controlContainer);

    // Create the slider input element
    sliderDiv = document.createElement('input');
    sliderDiv.type = "range";
    sliderDiv.className = "flat-slider";
    sliderDiv.style.flexGrow = '1';
    sliderDiv.min = "0";
    sliderDiv.max = "100"; // Initial max, can be updated later
    sliderDiv.value = "0";

    let sliderDragging = false;
    let sliderFade = false;

    function newFrame(frame) {
        par.frame = frame;
        par.renderOne = true;
    }

    function getFrameFromSlider() {
        const frame = parseInt(sliderDiv.value, 10);
        newFrame(frame);
    }

    sliderContainer.appendChild(sliderDiv);
    document.body.appendChild(sliderContainer);

    // Event listeners for slider interactions
    sliderDiv.addEventListener('input', () => {
        newFrame(parseInt(sliderDiv.value, 10));
        sliderDragging = true;
        par.paused = true;
    });

    sliderDiv.addEventListener('change', () => {
        if (sliderFade) {
            sliderDiv.style.opacity = "1";
            setTimeout(() => { sliderDiv.style.opacity = "0"; }, 200); // fade out
            sliderFade = false;
        }
        sliderDragging = false;
    });

    sliderDiv.style.opacity = "0"; // Initially hidden

    sliderContainer.addEventListener('mouseenter', () => {
        console.log("Hover Start");
        if (!sliderDragging) {
            sliderDiv.style.opacity = "0";
            setTimeout(() => { sliderDiv.style.opacity = "1"; }, 200); // fade in
            controlContainer.style.opacity = "0";
            setTimeout(() => { controlContainer.style.opacity = "1"; }, 200); // fade in
        }
        sliderFade = false;
    });

    sliderContainer.addEventListener('mouseleave', () => {
        if (sliderDragging) {
            sliderFade = true;
        } else {
            sliderDiv.style.opacity = "1";
            setTimeout(() => { sliderDiv.style.opacity = "0"; }, 200); // fade out
            controlContainer.style.opacity = "1";
            setTimeout(() => { controlContainer.style.opacity = "0"; }, 200); // fade out
            sliderFade = false;
        }
    });
}

export function updateFrameSlider() {
    if (sliderDiv.style.opacity === "1") {
        const currentValue = parseInt(sliderDiv.value, 10);
        if (currentValue !== par.frame) {
            sliderDiv.value = par.frame;
        }

        const max = parseInt(sliderDiv.max, 10);
        if (max !== Sit.frames) {
            sliderDiv.max = Sit.frames;
        }
    }
}

// Utility function to create a div using a sprite from a sprite sheet
function createSpriteDiv(row, column, onClickHandler) {
    const div = document.createElement('div');
    div.style.width = '40px';
    div.style.height = '40px';
    div.style.backgroundImage = 'url(./data/images/video-sprites-40px-5x3.png)'; // Replace with the actual sprite sheet path
    div.style.backgroundSize = '200px 120px'; // Updated to match the actual sprite sheet size
    div.style.backgroundPosition = `-${column * 40}px -${row * 40}px`; // Corrected to reflect sprite size in 200x120 image
    div.style.backgroundRepeat = 'no-repeat'; // Ensure only one sprite is displayed
    div.style.cursor = 'pointer';
    div.addEventListener('click', onClickHandler);
    return div;
}

// Utility function to create a button container
function createButtonContainer() {
    const container = document.createElement('div');
    container.style.width = '40px';
    container.style.height = '40px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    return container;
}

// Function to update the play/pause button based on the state of par.paused
function updatePlayPauseButton() {
    if (par.paused) {
        playPauseButton.style.backgroundPosition = `-${spriteLocations.play.col * 40}px -${spriteLocations.play.row * 40}px`;
    } else {
        playPauseButton.style.backgroundPosition = `-${spriteLocations.pause.col * 40}px -${spriteLocations.pause.row * 40}px`;
    }
}

// Play/Pause toggle function
function togglePlayPause() {
    if (playInterval === null) {
        par.paused = false;
        updatePlayPauseButton();
        playInterval = setInterval(() => {
            let currentFrame = parseInt(sliderDiv.value, 10);
            if (currentFrame < parseInt(sliderDiv.max, 10)) {
                setFrame(currentFrame + 1);
            } else {
                clearInterval(playInterval);
                playInterval = null;
                par.paused = true;
                updatePlayPauseButton();
            }
        }, 100); // Adjust speed as needed
    } else {
        clearInterval(playInterval);
        playInterval = null;
        par.paused = true;
        updatePlayPauseButton();
    }
}

// Advance a single frame function
function advanceOneFrame() {
    let currentFrame = parseInt(sliderDiv.value, 10);
    if (currentFrame < parseInt(sliderDiv.max, 10)) {
        setFrame(currentFrame + 1);
    }
}

// Back a single frame function
function backOneFrame() {
    let currentFrame = parseInt(sliderDiv.value, 10);
    if (currentFrame > 0) {
        setFrame(currentFrame - 1);
    }
}

// Set frame helper function
function setFrame(frame) {
    sliderDiv.value = frame;
    par.frame = frame;
}
