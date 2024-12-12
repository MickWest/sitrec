
// the page structure consists of either a single div that contains everything
// or three divs with id's of "BannerTop", "Content", and "BannerBottom"
// this is controlled by these environment variables
// BANNER_ACTIVE=true
// BANNER_TOP_TEXT=NOTIFICATION MESSAGE
// BANNER_BOTTOM_TEXT=NOTIFICATION MESSAGE
// BANNER_COLOR=#FFFFFF
// BANNER_BACKGROUND_COLOR=#004000
// BANNER_HEIGHT=20
// BANNER_TEXT_HEIGHT=16
// BANNER_BORDER_COLOR=#FF0000
// BANNER_FONT="Arial"


let setupDone = false;

export function setupPageStructure() {
    if (setupDone) return;
    setupDone = true;
    // if banner is not active, then we just have a single div
    if (!process.env.BANNER_ACTIVE) {
        // create the container div, with ID of "Content"
        const container = document.createElement('div');
        container.id = "Content";
        // full screen
        container.style.position = 'absolute';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        document.body.append(container)

        return;
    }

    // if we have a banner, then we have three divs
    // create the top banner
    const bannerTop = document.createElement('div');
    bannerTop.id = "BannerTop";
    bannerTop.style.position = 'absolute';
    bannerTop.style.width = '100%';
    bannerTop.style.height = process.env.BANNER_HEIGHT + 'px';
    bannerTop.style.backgroundColor = process.env.BANNER_BACKGROUND_COLOR;
    bannerTop.style.color = process.env.BANNER_COLOR;
    bannerTop.style.textAlign = 'center';
    bannerTop.style.fontFamily = process.env.BANNER_FONT;
    bannerTop.style.fontSize = process.env.BANNER_TEXT_HEIGHT + 'px';
    bannerTop.style.lineHeight = process.env.BANNER_HEIGHT + 'px';
  //  bannerTop.style.borderBottom = '1px solid ' + process.env.BANNER_BORDER_COLOR;
    bannerTop.innerHTML = process.env.BANNER_TOP_TEXT;
    document.body.append(bannerTop);

    // create the content div, accoiunting for both top and bottom
    const container = document.createElement('div');
    container.id = "Content";
    container.style.position = 'absolute';
    container.style.width = '100%';
    container.style.height = 'calc(100% - ' + (2 * process.env.BANNER_HEIGHT) + 'px)';
    container.style.top = process.env.BANNER_HEIGHT + 'px';
    container.style.overflow = 'hidden';
    document.body.append(container)

    const test = document.getElementById("Content");
    console.log(test)


    // create the bottom banner
    const bannerBottom = document.createElement('div');
    bannerBottom.id = "BannerBottom";
    bannerBottom.style.position = 'absolute';
    // position at the bottom
    bannerBottom.style.bottom = 0;
    bannerBottom.style.width = '100%';
    bannerBottom.style.height = process.env.BANNER_HEIGHT + 'px';
    bannerBottom.style.backgroundColor = process.env.BANNER_BACKGROUND_COLOR;
    bannerBottom.style.color = process.env.BANNER_COLOR;
    bannerBottom.style.textAlign = 'center';
    bannerBottom.style.fontSize = process.env.BANNER_TEXT_HEIGHT + 'px';
    bannerBottom.style.fontFamily = process.env.BANNER_FONT;
    bannerBottom.style.lineHeight = process.env.BANNER_HEIGHT + 'px';
  //  bannerBottom.style.borderTop = '1px solid ' + process.env.BANNER_BORDER_COLOR;
    bannerBottom.innerHTML = process.env.BANNER_BOTTOM_TEXT;
    document.body.append(bannerBottom);


}
