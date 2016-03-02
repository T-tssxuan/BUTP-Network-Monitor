var Cookie;

/**
 * Get account manage system session cookie and checkcode
 * @Param:
 *  info: record the session cookie and checkcode
 */
function getCookieAndCheckcode(info) {
	// remove the request cookie
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

    // set the session cookie
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

	var xhr = new XMLHttpRequest();
	xhr.open("get", "http://gwself.bupt.edu.cn/nav_login");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var checkcode = /"\d{4}"/g.exec(xhr.responseText)
                .toString().substring(1, 5);
            info[1] = checkcode;
            var img = new XMLHttpRequest();
            img.open("GET", "http://gwself.bupt.edu.cn/RandomCodeAction.action?randomNum=" + Math.random());
            img.send();
        }
    }
	xhr.send();

    return info;
}

/**
 * Login the account manage system
 * @Param:
 *  info: log information
 *  user_info: user information
 */
function login(info, user_info) {
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
 *  tag: the tag of the terminal.
 */
function tooffline(tag){
    var url = "http://gwself.bupt.edu.cn/tooffline?t=" + Math.random();
    url += "&fldsessionid=" + tag;
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

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.send();
}

// Record the login information.
var log_info = ["", "", false, 0];

/**
 * Log off all terminal.
 * @Param:
 *  user_info: the user information
 */
function logOffTerminals(user_info) {
    if (!log_info[2]) {
        getCookieAndCheckcode(log_info);
    }
    setTimeout(function() {
        if (!log_info[2]) {
            login(log_info, user_info);
            log_info[3] ++;
        }
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
                        var tags = str[0].match(/<td style="display:none;">\d+?<\/td>/g);
                        if (tags == null) {
                            return;
                        }
                        for (var i = 0; i < tags.length; i++ ) {
                            tags[i] = /\d+/g.exec(tags[i])[0];
                        }
                        tags.forEach(function(tag) {
                            tooffline(tag);
                        });
                    }
                }
            }
            xhr.send();
        }, 500);
    }, 500);
}

/**
 * Check the flow information and decide the next operation
 * @Param:
 *  user_info: the user information
 */
function checkFlowInfo(user_info) {
    var xhr = new XMLHttpRequest();
    var url = user_info["gateway"];
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t|\s)/g, "");
            var ele = document.getElementById("flow");
            // check whether login gateway
            if (content.search("欢迎登录北邮校园网络") != -1) {
                return;
            } else {
                var tmp = /flow=.*?;/g.exec(content);
                var flow = Number(/\d+/g.exec(tmp[0])[0]) / (1024 * 1024);
                // judge the total flow threshold
                if (user_info["threshold_switch"]) {
                    var threshold = Number(user_info['threshold']);
                    if (flow > threshold) {
                        logOffTerminals(user_info);
                    }
                }
                // judge the hourly flow threshold
                if (user_info["hour_max_switch"]) {
                    var last_time = Number(user_info["last_time"]);
                    var last_flow = Number(user_info["flow"]);
                    var hour_max = Number(user_info["hour_max"]);
                    var time = (Date.now() - last_time) / (1000 * 60 * 60);
                    if (last_time != 0) {
                        if (flow - last_flow > hour_max) {
                            logOffTerminals(user_info);
                        }
                        if (time > 1) {
                            user_info["last_time"] = Date.now();
                            user_info["flow"] = flow;
                            saveUserInfo(user_info);
                        }
                    } else {
                        user_info["last_time"] = Date.now();
                        user_info["flow"] = flow;
                        saveUserInfo(user_info);
                    }
                }
            }
        }
    }
    xhr.send();
}

/**
 * Get local user information
 * @Param:
 *  user_info: the user information
 */
function getUserInfo(user_info) {
    var arr = ["id", "password", "gateway", "hour_max", "hour_max_switch", "threshold", "threshold_switch", "last_time", "flow"];
    chrome.storage.sync.get(arr, function(info) {
        if ("id" in info) {
            user_info["id"] = info["id"];
        }
        if ("password" in info) {
            user_info["password"] = info["password"];
        }
        if ("gateway" in info) {
            user_info["gateway"] = info["gateway"];
        }
        user_info["hour_max"] = 0;
        if ("hour_max" in info) {
            user_info["hour_max"] = info["hour_max"];
        }
        user_info["hour_max_switch"] = false;
        if ("hour_max_switch" in info) {
            user_info["hour_max_switch"] = info["hour_max_switch"];
        }
        user_info["threshold"] = 0;
        if ("threshold" in info) {
            user_info["threshold"] = info["threshold"];
        }
        user_info["threshold_switch"] = false;
        if ("threshold_switch" in info) {
            user_info["threshold_switch"] = info["threshold_switch"];
        }
        user_info["last_time"] = 0;
        if ("last_time" in info) {
            user_info["last_time"] = info["last_time"];
        }
        user_info["flow"] = 0;
        if ("flow" in info) {
            user_info["flow"] = info["flow"];
        }
    });
}

/**
 * Save the user information.
 * @Param:
 *  user_info: the user information
 */
function saveUserInfo(user_info) {
    chrome.storage.sync.set(user_info, function() {
        console.log("--->saved user_info");
    });
}

var user_info = {};

// Run the information check every minute
setInterval(function() {
    getUserInfo(user_info);
    if ("threshold_switch" in user_info) {
        if (user_info["threshold_switch"] || user_info["hour_max_switch"]) {
            checkFlowInfo(user_info);
        }
    }
}, 60000);
