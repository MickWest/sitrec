import { par } from './par';
import { Sit } from './Globals';

let sliderDiv;

// this is the slider at the bottom of the screen
export function SetupFrameSlider() {
  const sliderContainer = document.createElement('div');

  sliderContainer.style.position = 'absolute';
  sliderContainer.style.height = '15px';
  sliderContainer.style.bottom = '0px';
  sliderContainer.style.width = '100%';
  sliderContainer.style.zIndex = '1001'; // needed to get mouse events when over other windows

  sliderDiv = document.createElement('div');
  sliderDiv.className = 'flat-slider';
  sliderDiv.style.position = 'absolute';
  sliderDiv.style.bottom = '5px';
  sliderDiv.style.zIndex = '1001';
  sliderDiv.style.left = '1%';
  sliderDiv.style.right = '99%';
  sliderDiv.style.width = '98%';

  let sliderDragging = false;
  let sliderFade = false;

  function newFrame(frame) {
    //        console.log ("newFrame = "+frame+", updates old par.frame = "+par.frame)
    par.frame = frame;

    par.renderOne = true;
  }

  function getFrameFromSlider() {
    const frame = $(sliderDiv).slider('value');
    //        console.log ("Slider value = "+frame+", updates old par.frame = "+par.frame)
    newFrame(frame);
  }

  sliderContainer.appendChild(sliderDiv);
  document.body.appendChild(sliderContainer);

  //  $( function() {
  $(sliderDiv).slider({
    max: 100, // was Sit.frames, but we want to set this later
    slide: (event, ui) => {
      //            console.log("Slider SLIDE par frame = "+par.frame +", ui.value = "+ui.value+", $(sliderDiv).slider(\"value\") = " +$(sliderDiv).slider("value") )
      newFrame(ui.value);
      //            getFrameFromSlider();
      sliderDragging = true;
      par.paused = true;
    },
    //         change: frameSlider,
    start: (event, ui) => {
      //            console.log("Slider Start par frame = "+par.frame +", ui.value = "+ui.value+", $(sliderDiv).slider(\"value\") = " +$(sliderDiv).slider("value") )
    },
    change: (event, ui) => {
      //            console.log("Slider Change par frame = "+par.frame +", ui.value = "+ui.value+", $(sliderDiv).slider(\"value\") = " +$(sliderDiv).slider("value") )
    },
    stop: (event, ui) => {
      //            console.log("Slider Stop")
      //            console.log("Slider STOP par frame = "+par.frame +", ui.value = "+ui.value+", $(sliderDiv).slider(\"value\") = " +$(sliderDiv).slider("value") )
      if (sliderFade) {
        $(sliderDiv).stop().fadeIn();
        $(sliderDiv).fadeOut();
        sliderFade = false;
      }
      sliderDragging = false;
      //            console.log("sliderDragging = "+ sliderDragging)
    },
  });

  $(sliderDiv).hide();

  $(sliderContainer).hover(
    () => {
      console.log('Hover Start');
      // Hover start, if not dragging, then we want to fade in
      if (!sliderDragging) {
        //                console.log("Hover Start Fade In")
        $(sliderDiv).stop().fadeOut();
        $(sliderDiv).fadeIn();
      }
      //            console.log("Hover Start Clear Flag Fade")
      sliderFade = false;
    },
    () => {
      //            console.log("Hover End")
      //            console.log("sliderDragging = "+ sliderDragging)
      // hover end, if dragging then just flag we want to fade out later
      if (sliderDragging) {
        //                console.log("Hover End Flag Fade")
        sliderFade = true;
      } else {
        // otherwise fade out now
        //                console.log("Hover End Fade Out")
        $(sliderDiv).stop().fadeIn();
        $(sliderDiv).fadeOut();
        sliderFade = false;
      }
    }
  );
}

export function updateFrameSlider() {
  if ($(sliderDiv).is(':visible')) {
    if ($(sliderDiv).slider('value') !== par.frame) {
      $(sliderDiv).slider('option', 'value', par.frame);
    }

    const max = $(sliderDiv).slider('option', 'max');
    if (max !== Sit.frames) {
      $(sliderDiv).slider('option', 'max', Sit.frames);
    }
  }
}
