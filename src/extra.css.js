
export const extraCSS = `
.uplot {
    font-family: monospace;
}


.u-legend {
    font-size: 14px;
    margin: auto;
    text-align: left;
    line-height: 1.0;
}


body {
    color: #000;
    font-family:Monospace;
    font-size:20px;
    background-color: #fff;
    margin: 0px;
    overflow: hidden;
}


#output {
    color: #000;
    font-family:Monospace;
    font-size:15px;
    position: absolute;
    top: 50%; width: 60%;

//white-space: pre;
}

#myChart {
    color: #000;
    font-family:Monospace;
    font-size:15px;
    position: absolute;
    top: 50%; width: 60%;
    padding: 10px;
//white-space: pre;
}
a {

    color: #0080ff;
}
.label {
    color: #FFF;
    font-family: sans-serif;
    padding: 2px;
    background: rgba( 0, 0, 0, .6 );
}

/* lugolabs.com/flat-slider */


// .flat-slider.ui-corner-all,
// .flat-slider .ui-corner-all {
//     border-radius: 0;
// }
//
// .flat-slider.ui-slider {
//     border: 0;
//     background: #f7d2cc;
//     border-radius: 7px;
// }
//
// .flat-slider.ui-slider-horizontal {
//     height: 10px;
// }
//
// .flat-slider.ui-slider-vertical {
//     height: 15em;
//     width: 4px;
// }

// .flat-slider .ui-slider-handle {
//     width: 130px;
//     height: 150px;
//     background: #38b11f;
//     border-radius: 50%;
//     border: none;
//     cursor: pointer;
// }

// .flat-slider.ui-slider-horizontal .ui-slider-handle {
//     top: 50%;
//     margin-top: -7.5px;
// }
//
// .flat-slider.ui-slider-vertical .ui-slider-handle {
//     left: 50%;
//     margin-left: -6.5px;
// }
//
// .flat-slider .ui-slider-handle:hover {
//     opacity: .8;
// }
//
// .flat-slider .ui-slider-range {
//     border: 0;
//     border-radius: 7;
//     background: #dfe385;
// }
//
// .flat-slider.ui-slider-horizontal .ui-slider-range {
//     top: 0;
//     height: 4px;
// }
//
// .flat-slider.ui-slider-vertical .ui-slider-range {
//     left: 0;
//     width: 4px;
// }

////////////////////////////////////////////////////////////////////////
// lil-gui

// a button in lil-gui is used as a menu item
// so we style it to be more like a Mac/Windows menu item
// left centered text, inset a few pixels
.lil-gui .name {
    text-align: left;
    padding-left: 5px;
    background: #1f1f1f;    // same as --background-color
}
    
.lil-gui button {
    text-align: left;
    background: #1f1f1f;
}

.lil-gui.transition > .children {
        transition-duration: 1ms;  // changed from 300ms to 1ms 
}

.lil-gui.closed > .title:before {
  content: ""; 
}
.lil-gui .lil-gui.closed > .title:before {
  content: "▸";  
}

.lil-gui .title:before {
  font-family: "lil-gui";
  content: "";  
  padding-right: 2px;
  display: inline-block;
}

.lil-gui .lil-gui .title:before {
  font-family: "lil-gui";
  content: "▾";  
  padding-right: 2px;
  display: inline-block;
}

// INDENT TOP-LEVEL FOLDERS 
// THIS IS LIKE .lil-gui .lil-gui .lil-gui > .children, BUT WITH ONE LESS .lil-gui 
// I also use a dark blue background and a thicker white left border
// to ensure the folder is visually distinctive

.lil-gui .lil-gui > .children {
    border: none;
    border: 1px solid #FFFFFF;
    background: #202030;
}

.lil-gui .lil-gui .lil-gui > .children {

    border-left: none;
    border: 1px solid #FFFFFF;
}

body.hide-cursor {
    cursor: none;
}


`;