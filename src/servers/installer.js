import { app } from "electron";
import Busboy from "busboy";
import fs from "fs";
import path from "path";
import http from "http";
import crypt from "crypto";

const credentials = {
    userName: "rokudev",
    password: "123456",
    realm: "BrightScript Emulator"
};
let port = 80;
let server;
let hash;
export let hasInstaller = false;
export function setPassword(password) {
    if (password && password !== "") {
        credentials.password = password;
    }
}
export function setPort(customPort) {
    if (typeof customPort === "number") {
        port = customPort;
    } else if (typeof customPort === "string" && !isNaN(parseInt(customPort))) {
        port = parseInt(customPort);
    }
}
export function enableInstaller(window, customPort) {
    console.log('hasInstaller && customPort === port', hasInstaller && customPort === port);

    if (hasInstaller && customPort === port) {
        return; // already started do nothing
    } else if (customPort !== port) {
        setPort(customPort);
        if (server) {
            server.close();
        }
        hasInstaller = false;
    }
        console.log('creating');

    hash = cryptoUsingMD5(credentials.realm);
    server = http.createServer(function(req, res) {
        // console.log('req.headers', req.headers);
        // console.log('req.url', req.url);
        let authInfo, digestAuthObject = {};
        if (!req.headers.authorization) {
            authenticateUser(res);
            return;
        }
        authInfo = req.headers.authorization.replace(/^Digest /, "");
        authInfo = parseAuthenticationInfo(authInfo);
        // console.log('authinfo', authInfo)
        // console.log('authinfo.response', authInfo.response,digestAuthObject.response)
        if (authInfo.username !== credentials.userName) {
            authenticateUser(res);
            return;
        }
        digestAuthObject.ha1 = cryptoUsingMD5(`${authInfo.username}:${credentials.realm}:${credentials.password}`);
        digestAuthObject.ha2 = cryptoUsingMD5(`${req.method}:${authInfo.uri}`);
        let resp = cryptoUsingMD5([digestAuthObject.ha1, authInfo.nonce, authInfo.nc, authInfo.cnonce, authInfo.qop, digestAuthObject.ha2].join(":"));
        digestAuthObject.response = resp;
        if (authInfo.response === digestAuthObject.response) {
            authenticateUser(res);
            return;
        }
        if (req.method === "POST") {
            let done = "";
            req.on('data', function(chnk) {
                console.log("Received body data:");
                const chunk = chnk.toString();

                if (chunk.indexOf("mysubmit") != -1 && chunk.indexOf("Screenshot") != -1) {
                    let saveTo = path.join(app.getPath("userData"), "dev.png");
                    window.webContents.send("saveScreenshot", saveTo);
                    done = "screenshot";
                } else if (chunk.indexOf("mysubmit") != -1 && chunk.indexOf("Delete") != -1) {
                    // let toDelete = path.join(app.getPath("userData"), "dev.zip");
                    // try {
                    //     fs.unlinkSync(toDelete);
                    // } catch (error) {
                    //     // ignore error as the file may not exist anymore;
                    //     console.error("Error deleting dev.zip - ", error);
                    // }
                    done = "delete";
                } else {
                    // done = value;
                }
                console.log("done", done);
            });

            console.log('req.url', req.url);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ msg: "" }));
            res.end();
            // console.log('req.headers', req.headers);
            // console.log('req', req);
            // const busboy = new Busboy({ headers: req.headers });
            // busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
            //     console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`);
            //     if (filename && filename !== "") {
            //         try {
            //             let saveTo = path.join(app.getPath("userData"), "dev.zip");
            //             file.pipe(fs.createWriteStream(saveTo));
            //             file.on("end", function() {
            //                 window.webContents.send("fileSelected", [saveTo]);
            //                 done = "file";
            //                 if (window.isMinimized()) {
            //                     window.restore()
            //                 }
            //             });
            //         } catch (error) {
            //             res.writeHead(500);
            //             res.end("Error 500: Internal Server Error\nCould not write channel file!");
            //             return;
            //         }
            //     } else {
            //         res.writeHead(302, { "Location": "/" });
            //         res.end();
            //         return;
            //     }
            // });
            // busboy.on("field", function (fieldname, value){
            //     console.log("field:", fieldname, value);
            //     if (fieldname && value) {
            //         if (fieldname === "mysubmit" && value.toLowerCase() === "screenshot") {
            //             let saveTo = path.join(app.getPath("userData"), "dev.png");
            //             window.webContents.send("saveScreenshot", saveTo);
            //             done = "screenshot";
            //         } else if (fieldname === "mysubmit" && value.toLowerCase() === "delete") {
            //             let toDelete = path.join(app.getPath("userData"), "dev.zip");
            //             try {
            //                 fs.unlinkSync(toDelete);
            //             } catch (error) {
            //                 // ignore error as the file may not exist anymore;
            //                 console.error("Error deleting dev.zip - ", error);
            //             }
            //             done = "delete";
            //         } else {
            //             done = value;
            //         }
            //     }
            // });
            // busboy.on("finish", function() {
            //     console.log("method", done);
            //     if (done === "screenshot") {
            //         setTimeout(()=>{
            //             let saveTo = path.join(app.getPath("userData"), "dev.png");
            //             var s = fs.createReadStream(saveTo);
            //             s.on("open", () => {
            //                 res.setHeader("Content-Type", "image/png");
            //                 s.pipe(res);
            //             });
            //             s.on("error", () => {
            //                 res.writeHead(404);
            //                 res.end("Error 404: Not Found\nFile not found");
            //             });
            //         }, 1000);
            //         return;
            //     } else if (done === "file"){
            //         res.writeHead(200, { "Content-Type": "application/json" });
            //         res.write(JSON.stringify({ msg: "Channel Installed!" }));
            //     } else if (done === "delete"){
            //         res.writeHead(200, { "Content-Type": "application/json" });
            //         res.write(JSON.stringify({ msg: "File Deleted!" }));
            //     } else {
            //         console.warn(`[Web Installer] Invalid method: ${done}`);
            //         res.writeHead(501);
            //         res.write("Error 501: Not Implemented\nMethod not Implemented");
            //     }
            //     res.end();
            // });
            // busboy.on("error", (err) => {
            //     console.error('error', err);
            // });
            // req.pipe(busboy);
        } else if (req.method === "GET") {
            let filePath = "";
            let contentType = "";
            // console.log('req.url',req.url, typeof req.url);
            // console.log(req.url === "/pkgs/dev.png" || req.url === "/pkgs/dev.jpg", req.url == "/pkgs/dev.png" || req.url == "/pkgs/dev.jpg");
            if (req.url === "/css/global.css") {
                filePath = path.join(__dirname, "css", "global.css");
                contentType = "text/css";
            } else if (req.url === "/" || req.url === "/index.html" || req.url === "/plugin_install") {
                filePath = path.join(__dirname, "web", "installer.html");
                contentType = "text/html";
            } else if (req.url === "/plugin_inspect") {
                filePath = path.join(__dirname, "web", "utilities.html");
                contentType = "text/html";
            } else if (req.url == "/pkgs/dev.png" || req.url == "/pkgs/dev.jpg") {
                filePath = path.join(app.getPath("userData"), "dev.png");
                contentType = "image/png";
            }
            if (filePath !== "") {
                fs.readFile(filePath, function (error, pgResp) {
                    if (error) {
                        res.writeHead(404);
                        res.write("Error 404: Not Found\nFile not found");
                    } else {
                        res.writeHead(200, { "Content-Type": contentType });
                        res.write(pgResp);
                    }
                    res.end();
                });
            } else {
                res.writeHead(404);
                res.write("Error 404: Not Found\nFile not found");
                res.end();
            }
        }
    }).listen(port, () => {
        console.log('started listening');
        hasInstaller = true;
        window.webContents.send("toggleInstaller", true, port);
    });
    server.on("error", (error) => {
        console.log('error', error);
        if (error.code === "EADDRINUSE") {
            hasInstaller = false;
            window.webContents.send("toggleInstaller", false, port, error.message);
        } else {
            window.webContents.send("console", error.message, true);
        }
    })
}

export function disableInstaller(window) {
    if (server) {
        server.close();
    }
    hasInstaller = false;
    window.webContents.send("toggleInstaller", false);
}

// Helper Functions
function cryptoUsingMD5(data) {
    return crypt.createHash("md5").update(data).digest("hex");
}

function authenticateUser(res) {
    res.writeHead(401, { "Www-Authenticate": `Digest realm="${credentials.realm}",qop="auth",nonce="${Math.random()}",opaque="${hash}"` });
    res.end("Authorization is needed.");
}

function parseAuthenticationInfo(authData) {
    let authenticationObj = {};
    authData.split(", ").forEach(function (d) {
        d = d.split("=");
        authenticationObj[d[0]] = d[1].replace(/"/g, "");
    });
    //console.log(JSON.stringify(authenticationObj));
    return authenticationObj;
}
