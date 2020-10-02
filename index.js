
require("dotenv").config()

const clientId = process.env.APP_CLIENT_ID;
const clientSecret = process.env.APP_CLIENT_SECRET;

const http = require("http");
const https = require("https");
const queryString = require("querystring");
const activeWin = require("active-win");
const discordRpc = require("discord-rpc");

let ready = false;
let autoMuted = false;
let accessToken = "";

if (!(clientId && clientSecret)) {
    console.log("The client ID or secret is invalid or missing from the .env file. Exiting.")
    process.exit();
}

let rpc = new discordRpc.Client({transport: "ipc"});

rpc.on("ready", () => {
    ready = true;
    console.log("RPC connected.");
});

let setMuteState = (shouldMute) => { //This is where we do all of the muting logic.
    if (autoMuted == shouldMute) return;

    autoMuted = !autoMuted;
    console.log("AutoMute was " + (autoMuted ? "enabled" : "disabled") + ".");

    rpc.setVoiceSettings({mute: shouldMute});
}

setInterval(async () => { //We check if we need to auto-mute here.
    if (!ready) return;

    let activeWindow = await activeWin();
    if (!activeWindow) {setMuteState(false); return};

    if (activeWindow.owner.name != "osu!.exe") {setMuteState(false); return};

    setMuteState(activeWindow.title != "osu!");
}, 100);

let httpServer = http.createServer((req, res) => { //Initial setup is done via a temporary local web server
    if (req.method != "GET") {res.end(); return};
    if (!req.url.startsWith("/?code=")) {res.end(); return};

    let code = req.url.substring(7)

    console.log("Client code recieved, sending access token request...");

    let requestData = queryString.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3400",
        scope: "rpc"
    })

    let apiRequest = https.request({
        host: "discord.com",
        path: "/api/oauth2/token",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(requestData)
        }
    }, res => {
        let response = "";

        res.on("data", chunk => {
            response += chunk;
        });
        
        res.on("end", () => {
            response = JSON.parse(response);
            accessToken = response.access_token;

            console.log("Access token recieved: " + accessToken);

            rpc.login({clientId: clientId, scopes: ["rpc"], accessToken: accessToken});
        });
    });

    apiRequest.write(requestData);
    apiRequest.end();
    
    res.write("osu!-AutoMute has been set up, you can now close this tab.");
    res.end();

    httpServer.close();
}).listen(3400);

console.log("Please visit the link below to set up osu!-AutoMute.");
console.log("https://discord.com/api/oauth2/authorize?client_id=" + clientId + "&redirect_uri=http%3A%2F%2Flocalhost%3A3400&response_type=code&scope=rpc");