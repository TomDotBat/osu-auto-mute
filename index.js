
const activeWin = require('active-win');

let autoMuted = false;

let setMuteState = (shouldMute) => { //This is where we do all of the muting logic.
    if (autoMuted == shouldMute) return;

    autoMuted = !autoMuted;
    console.log("AutoMute was " + (autoMuted ? "enabled" : "disabled") + ".");
}

setInterval(async () => { //We check if we need to auto-mute here.
    let activeWindow = await activeWin();
    if (!activeWindow) {setMuteState(false); return};

    if (activeWindow.owner.name != "osu!.exe") {setMuteState(false); return};

    setMuteState(activeWindow.title != "osu!");
}, 100);