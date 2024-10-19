import { par } from "./par";
import { Sit } from "./Globals";

let sliderDiv, playPauseButton, startButton, endButton, frameAdvanceButton, frameBackButton;
let playInterval = null;

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
    playPauseButton = createButtonWithIcon('▶️', '⏸', togglePlayPause);
    playPauseContainer.appendChild(playPauseButton);
    controlContainer.appendChild(playPauseContainer);

    // Single Frame Back Button
    const frameBackContainer = createButtonContainer();
    frameBackButton = createButton('|<', backOneFrame);
    frameBackContainer.appendChild(frameBackButton);
    controlContainer.appendChild(frameBackContainer);

    // Single Frame Advance Button
    const frameAdvanceContainer = createButtonContainer();
    frameAdvanceButton = createButton('>|', advanceOneFrame);
    frameAdvanceContainer.appendChild(frameAdvanceButton);
    controlContainer.appendChild(frameAdvanceContainer);

    // Start Button (Jump to start)
    const startContainer = createButtonContainer();
    startButton = createButton('|<<', () => setFrame(0));
    startContainer.appendChild(startButton);
    controlContainer.appendChild(startContainer);

    // End Button (Jump to end)
    const endContainer = createButtonContainer();
    endButton = createButton('>>|', () => setFrame(parseInt(sliderDiv.max, 10)));
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

// Utility function to create a button
function createButton(label, onClickHandler) {
    const button = document.createElement('button');
    button.innerText = label;
    button.style.marginRight = '5px';
    button.style.cursor = 'pointer';
    button.addEventListener('click', onClickHandler);
    return button;
}

// Utility function to create a button with toggleable icons
function createButtonWithIcon(playIcon, pauseIcon, onClickHandler) {
    const button = document.createElement('button');
    button.innerHTML = playIcon;
    button.style.marginRight = '5px';
    button.style.cursor = 'pointer';
    button.addEventListener('click', (event) => {
        onClickHandler();
        button.dataset.state = button.dataset.state === 'play' ? 'pause' : 'play';
        button.innerHTML = button.dataset.state === 'play' ? playIcon : pauseIcon;
    });
    button.dataset.state = 'play'; // Initial state set to play
    return button;
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

// Play/Pause toggle function
function togglePlayPause() {
    if (playInterval === null) {
        par.paused = false;
        playInterval = setInterval(() => {
            let currentFrame = parseInt(sliderDiv.value, 10);
            if (currentFrame < parseInt(sliderDiv.max, 10)) {
                setFrame(currentFrame + 1);
            } else {
                clearInterval(playInterval);
                playInterval = null;
                playPauseButton.dataset.state = 'play';
                playPauseButton.innerHTML = '▶️';
            }
        }, 100); // Adjust speed as needed
    } else {
        clearInterval(playInterval);
        playInterval = null;
        par.paused = true;
        playPauseButton.dataset.state = 'play';
        playPauseButton.innerHTML = '▶️';
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
