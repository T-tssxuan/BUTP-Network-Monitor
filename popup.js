var Cookie;

function getLocalIPs(callback) {
    var ips = [];

    var RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

    var pc = new RTCPeerConnection({
        iceServers: []
    });
    pc.createDataChannel('');
    
    pc.onicecandidate = function(e) {
        if (!e.candidate) { // Candidate gathering completed.
            pc.close();
            callback(ips);
            return;
        }
        var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) == -1 || /(^10.*)|(^2001.*)/g.test(ip)) {
            // avoid duplicate entries (tcp/udp)
            ips.push(ip);
        }
    };
    pc.createOffer(function(sdp) {
        pc.setLocalDescription(sdp);
    }, function onerror() {});
}

/**
 * Prepare for login the account manage system.
 * @Param:
 *  info: get the session cookie and checkcode.
 * @Return:
 *  none.
 */
function getCookieAndCheckcode(info) {
	// remove the request cookie, for get the fresh cookie
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		var headers = details.requestHeaders;
		var blockingResponse = {};
		for( var i = 0, l = headers.length; i < l; ++i ) {
			if( headers[i].name == 'Cookie' ) {
				headers.splice(i, 1);
				break;
			}
		}
		blockingResponse.requestHeaders = headers;
		return blockingResponse;
	},
	{urls: ["http://gwself.bupt.edu.cn/nav_login"]},
	['requestHeaders', "blocking"]);

    // get the session cookie
	chrome.webRequest.onHeadersReceived.addListener(function( details ) {
		details.responseHeaders.forEach(function(ele) {
			if (ele.name == "Set-Cookie") {
				var JSESSIONID = ele.value.substring(0, ele.value.indexOf(";"));
                info[0] = JSESSIONID;
                Cookie = JSESSIONID;
			}
		});
		return {responseHeaders:details.responseHeaders};
	},
	{urls: ["http://gwself.bupt.edu.cn/nav_login"]},
	["responseHeaders"]);

    // set the request session cookie which got previous.
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		var headers = details.requestHeaders;
		var blockingResponse = {};
		for( var i = 0, l = headers.length; i < l; ++i ) {
			if( headers[i].name == 'Cookie' ) {
                headers[i].value = info[0];
                break;
			}
		}
		blockingResponse.requestHeaders = headers;
		return blockingResponse;
	},
	{urls: ["http://gwself.bupt.edu.cn/RandomCodeAction*"]},
	['requestHeaders', "blocking"]);

    // request the account manage login page
	var xhr = new XMLHttpRequest();
	xhr.open("get", "http://gwself.bupt.edu.cn/nav_login");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            // extract the checkcode which need to provide when login
            var checkcode = /"\d{4}"/g.exec(xhr.responseText)
                .toString().substring(1, 5);
            info[1] = checkcode;
            // request the radomcode, this url must be request before login
            var img = new XMLHttpRequest();
            img.open("GET", "http://gwself.bupt.edu.cn/RandomCodeAction.action?randomNum=" + Math.random());
            img.send();
        }
    }
	xhr.send();
}

/**
 * Login the account manage system.
 * @Param:
 *  info: provide the session cookie and checkcode.
 *  user_info: provide user id and password.
 * @Return:
 *  none.
 */
function login(info, user_info) {
    // initial the header for login
    chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        var headers = details.requestHeaders;
        var blockingResponse = {};
        headers.push({name: "Cookie", value: info[0]});
        for (var i = 0; i < headers.length; i ++) {
            if (headers[i].name == "Origin") {
                headers[i].value = "http://gwself.bupt.edu.cn";
            }
            if (headers[i].name == "Accept") {
                headers[i].value = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
            }
        }
        headers.push({name: "Cache-Control", value: "max-age=0"});
        headers.push({name: "Referer", value: "http://gwself.bupt.edu.cn/nav_login"});
        blockingResponse.requestHeaders = headers;
        return blockingResponse;
    },
    {urls: ["http://gwself.bupt.edu.cn/LoginAction.action"]},
    ['requestHeaders', "blocking"]);

    // login the account manage system
    var xhr = new XMLHttpRequest();
    xhr.open("post", "http://gwself.bupt.edu.cn/LoginAction.action");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var str = xhr.responseText.replace(/(?:\r\n|\r|\n|\t)/g, "");
            // check whether login successful
            if (str.search("登 录") == -1) {
                info[2] = true;
            } else {
                var html = '<div class="item"> Login Error </div>';
                document.getElementById("terminals").innerHTML = html;
            }
        }
    }
    var pwd = calcMD5(user_info["password"]);
    data = "account=" + user_info["id"];
    data += "&password=" + pwd + "&code=&checkcode=" + info[1] + "&Submit=%E7%99%BB+%E5%BD%95";
    xhr.send(data);
}

/** 
 * Make a terminal off line.
 * @Param:
 *  tag: the tag of the terminal need to log off.
 * @Return:
 *  none.
 */
function tooffline(tag){
    var url = "http://gwself.bupt.edu.cn/tooffline?t=" + Math.random();
    url += "&fldsessionid=" + tag;
    // add the session cookie for the request
    chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        var headers = details.requestHeaders;
        var blockingResponse = {};
        for( var i = 0, l = headers.length; i < l; ++i ) {
            if( headers[i].name == 'Cookie' ) {
                headers[i].value = Cookie;
                break;
            }
        }
        blockingResponse.requestHeaders = headers;
        return blockingResponse;
    },
    {urls: [url]},
    ["requestHeaders", "blocking"]);

    // turn off the terminal.
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.send();
}

// record the global session cookie and checkcode, and account manage system
// login state.
var log_info = ["", "", false, 0];

/**
 * Get the terminal information of the account
 * @Param:
 *  user_info: provide user id and password
 */
function getTerminalInfo(user_info) {
    // prepare for login
    if (!log_info[2]) {
        getCookieAndCheckcode(log_info);
    }
    // waiting for the session cookie and other thing prepared.
    setTimeout(function() {
        // login account manage system.
        if (!log_info[2] && log_info[3] < 3) {
            login(log_info, user_info);
            log_info[3] ++;
        }
        // get terminal information
        setTimeout(function() {
            if (!log_info[2]) {
                return;
            }
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "http://gwself.bupt.edu.cn/nav_offLine");
            xhr.onreadystatechange = function() {
                if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                    var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t)/g, "");
                    var str = /<tbody>.*<\/tbody>/g.exec(content);
                    if (str.length != 0) {
                        var ips = str[0].match(/\d{1,3}\.\d{1,3}.\d{1,3}.\d{1,3}/g);
                        var tags = str[0].match(/<td style="display:none;">\d+?<\/td>/g);
                        var term = document.getElementById("terminals");
                        term.innerHTML = "";
                        if (ips == null) {
                            term.innerHTML = '<div class="item">No terminal.</div>';
                            return;
                        }
                        for (var i = 0; i < tags.length; i++ ) {
                            tags[i] = /\d+/g.exec(tags[i])[0];
                        }
                        var html = "";
                        // add terminals information to the panel
                        for (var i = 0; i < ips.length; i ++) {
                            var div = document.createElement("div");
                            div.className = "item";

                            var ip = document.createElement("span");
                            ip.textContent = "ip: " + ips[i];

                            var hide = document.createElement("span");
                            var style = document.createAttribute("style");
                            style.value = "display:none";
                            hide.setAttributeNode(style);
                            hide.textContent = tags[i];

                            var logoff = document.createElement("a");
                            var href = document.createAttribute("href");
                            href.value = "#";
                            logoff.setAttributeNode(href);
                            logoff.textContent = "log off";
                            logoff.appendChild(hide);

                            // listener of log off manipulation
                            logoff.addEventListener("click", function() {
                                console.log("++++++++++++++");
                                tooffline(this.lastChild.textContent);
                                console.log(this);
                                console.log(this.lastChild);
                            });

                            div.appendChild(ip);
                            div.appendChild(logoff);
                            term.appendChild(div);
                        };
                    }
                }
            }
            xhr.send();
        }, 500);
    }, 500);
}

/**
 * Get flow information.
 */
function getFlowInfo() {
    var xhr = new XMLHttpRequest();
    var url = document.getElementById("gateway").value;
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t|\s)/g, "");
            var ele = document.getElementById("flow");
            // check whether login gateway
            if (content.search("欢迎登录北邮校园网络") != -1) {
                var html = '<div class="item"> Please login gateway! </div>';
                ele.innerHTML = html;
            } else {
                // update flow information
                var tmp = /time=.*?;/g.exec(content);
                var time = Number(/\d+/g.exec(tmp[0])[0]);
                var tmp = /flow=.*?;/g.exec(content);
                var flow = Number(/\d+/g.exec(tmp[0])[0]) / 1024;
                var tmp = /fee=.*?;/g.exec(content);
                var fee = Number(/\d+/g.exec(tmp[0])[0]) / 10000;

                ele.innerHTML = "";
                var html = "";
                html += '<div class="item"> Used time: ' + time + ' Min </div>';
                if (flow > 1024) {
                    flow = flow / 1024;
                    flow = flow.toFixed(3);
                    html += '<div class="item"> Used internet traffic: ' + flow + ' Gbyte </div>';
                } else {
                    flow = flow.toFixed(3);
                    html += '<div class="item"> Used internet traffic: ' + flow + ' Mbyte </div>';
                }
                html += '<div class="item"> Balance: ' + fee + ' RMB </div>';
                ele.innerHTML = html;
            }
        }
    }
    xhr.send();
}

/**
 * Save user information
 */
function saveUserInfo(user_info) {
    chrome.storage.sync.set(user_info, function() {
        console.log("--->saved user_info");
    });
}

/**
 * Get chrome storged information
 * @Param:
 *  user_info: retrive the user information.
 */
function getUserInfo(user_info) {
    var arr = ["id", "password", "gateway", "hour_max", "hour_max_switch", "threshold", "threshold_switch"];
    chrome.storage.sync.get(arr, function(info) {
        if ("id" in info) {
            document.getElementById("id").value = info["id"];
            user_info["id"] = info["id"];
        }
        if ("password" in info) {
            document.getElementById("password").value = info["password"];
            user_info["password"] = info["password"];
        }
        if ("gateway" in info) {
            document.getElementById("gateway").value = info["gateway"];
            user_info["gateway"] = info["gateway"];
        }
        if ("hour_max" in info) {
            document.getElementById("hour_max").value = info["hour_max"];
            user_info["hour_max"] = info["hour_max"];
        }
        if ("hour_max_switch" in info) {
            document.getElementById("hour_max_switch").checked = info["hour_max_switch"];
            user_info["hour_max_switch"] = info["hour_max_switch"];
        }
        if ("threshold" in info) {
            document.getElementById("threshold").value = info["threshold"];
            user_info["threshold"] = info["threshold"];
        }
        if ("threshold_switch" in info) {
            document.getElementById("threshold_switch").checked= info["threshold_switch"];
            user_info["threshold_switch"] = info["threshold_switch"];
        }
    });
}

/**
 * Update flow information and terminal information every 5 seconds
 * @Param:
 *  user_info: user information
 */
function updateBasicInfo(user_info) {
	// get flow information
    getFlowInfo();
    if (("id" in user_info) && ("password" in user_info)) {
        getTerminalInfo(user_info);
    }
    setTimeout(function() {
        updateBasicInfo(user_info);
    }, 5000);
}

window.onload = function() {
    // get ip addresses
    getLocalIPs(function(ips) {
        ips.forEach(function (ele) {
            if (ele.length < 20) {
                document.getElementById("ipv4").textContent = ele;
            } else {
                document.getElementById("ipv6").textContent = ele;
            }
        });
    });

    var user_info = {};
    getUserInfo(user_info);
    updateBasicInfo(user_info);

    // listener for save user information operation
    document.getElementById("save").addEventListener("click", function() {
        user_info["id"] = document.getElementById("id").value;
        user_info["password"] = document.getElementById("password").value;
        user_info["gateway"] = document.getElementById("gateway").value;
        user_info["hour_max"] = document.getElementById("hour_max").value;
        user_info["hour_max_switch"] = document.getElementById("hour_max_switch").checked;
        user_info["threshold"] = document.getElementById("threshold").value;
        user_info["threshold_switch"] = document.getElementById("threshold_switch").checked;
        log_info[3] = 0;
        saveUserInfo(user_info);
    });

    // listener for login gateway operation
    document.getElementById("login_gateway").addEventListener("click", function() {
        var xhr = new XMLHttpRequest();
        var id = document.getElementById("id").value;
        var password = document.getElementById("password").value;
        var gateway = document.getElementById("gateway").value;
        xhr.open("POST", gateway);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        var data = "DDDDD=" + id + "&upass=" + password + "&0MKKey=";
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t|\s)/g, "");
                var ele = document.getElementById("flow");
                var html = "";
                if (content.search("账号或密码不对") != -1) {
                    html = '<div class="item"> Login Gateway Error! </div>';
                } else {
                    html = 'Login Gateway Successfully!';
                }
                ele.innerHTML = html;
            }
        }
        xhr.send(data);
    });
}
