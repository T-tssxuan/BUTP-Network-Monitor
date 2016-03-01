// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Cookie;

function getLocalIPs(callback) {
    var ips = [];

    var RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

    var pc = new RTCPeerConnection({
        // Don't specify any stun/turn servers, otherwise you will
        // also find your public IP addresses.
        iceServers: []
    });
    // Add a media line, this is needed to activate candidate gathering.
    pc.createDataChannel('');
    
    // onicecandidate is triggered whenever a candidate has been found.
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

	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		var headers = details.requestHeaders;
		var blockingResponse = {};
		for( var i = 0, l = headers.length; i < l; ++i ) {
			if( headers[i].name == 'Cookie' ) {
                console.log("#########################");
                console.log(info);
                headers[i].value = info[0];
                console.log("########################");
                break;
			}
		}
		blockingResponse.requestHeaders = headers;
		return blockingResponse;
	},
	{urls: ["http://gwself.bupt.edu.cn/RandomCodeAction*"]},
	['requestHeaders', "blocking"]);

	console.log("after add addListener");
	var xhr = new XMLHttpRequest();
	xhr.open("get", "http://gwself.bupt.edu.cn/nav_login");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            console.log("the cookie is");
            var checkcode = /"\d{4}"/g.exec(xhr.responseText)
                .toString().substring(1, 5);
            info[1] = checkcode;
            console.log("**************************************");
            console.log(checkcode);
            console.log("=======================================");
            console.log(xhr.getResponseHeader("Cookie"));
            console.log("---------------------------------------");
            console.log(xhr.getAllResponseHeaders());
            var img = new XMLHttpRequest();
            img.open("GET", "http://gwself.bupt.edu.cn/RandomCodeAction.action?randomNum=" + Math.random());
            img.send();
        }
    }
	xhr.send();

    return info;
}


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
        console.log(headers);
        blockingResponse.requestHeaders = headers;
        return blockingResponse;
    },
    {urls: ["http://gwself.bupt.edu.cn/LoginAction.action"]},
    ['requestHeaders', "blocking"]);

	chrome.webRequest.onHeadersReceived.addListener(function( details ) {
		console.log(details);
		details.responseHeaders.forEach(function(ele) {
			if (ele.name == "Set-Cookie") {
				var JSESSIONID = ele.value.substring(0, ele.value.indexOf(";"));
				console.log("+++++++++my Cookie: " + JSESSIONID);
			}
		});
		return {responseHeaders:details.responseHeaders};
	},
	{urls: ["http://gwself.bupt.edu.cn/LoginAction.action"]},
	["responseHeaders"]);

    var xhr = new XMLHttpRequest();
    xhr.open("post", "http://gwself.bupt.edu.cn/LoginAction.action");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^");
            console.log(xhr.responseText);
            var str = xhr.responseText.replace(/(?:\r\n|\r|\n|\t)/g, "");
            if (str.search("登 录") == -1) {
                info[2] = true;
            } else {
                var html = '<div class="item"> Login Error </div>';
                document.getElementById("terminals").innerHTML = html;
            }
            console.log(xhr.getAllResponseHeaders());
            console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^");
        }
    }
    var pwd = calcMD5(user_info["password"]);
    data = "account=" + user_info["id"];
    data += "&password=" + pwd + "&code=&checkcode=" + info[1] + "&Submit=%E7%99%BB+%E5%BD%95";
    console.log("--------------->: " + data);
    xhr.send(data);
}

function tooffline(tag){
    var url = "http://gwself.bupt.edu.cn/tooffline?t=" + Math.random();
    url += "&fldsessionid=" + tag;
    console.log("!!!!!!!!!!!!!!!!!!!!!!!" + url + "!!!!!!!!!!!!!!!!!");
    chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        var headers = details.requestHeaders;
        var blockingResponse = {};
        console.log(headers);
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
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            console.log("===============log off==================");
            console.log(xhr.responseText);
            console.log("===============log off==================");
        }
    }   
    xhr.send();
}

var log_info = ["", "", false, 0];
function getTerminalInfo(user_info) {
    console.log(log_info);
    if (!log_info[2]) {
        getCookieAndCheckcode(log_info);
    }
    setTimeout(function() {
        if (!log_info[2] && log_info[3] < 3) {
            login(log_info, user_info);
            log_info[3] ++;
            console.log("after login");
        }
        setTimeout(function() {
            if (!log_info[2]) {
                return;
            }
            var xhr = new XMLHttpRequest();
            console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%");
            xhr.open("GET", "http://gwself.bupt.edu.cn/nav_offLine");
            xhr.onreadystatechange = function() {
                if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
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
                        console.log(ips);
                        var html = "";
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
                    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
                }
            }
            xhr.send();
        }, 500);
    }, 500);
}

function getFlowInfo(url) {
    var xhr = new XMLHttpRequest();
    var url = document.getElementById("gateway").value;
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t|\s)/g, "");
            var ele = document.getElementById("flow");
            if (content.search("欢迎登录北邮校园网络") != -1) {
                var html = '<div class="item"> Please login gateway! </div>';
                ele.innerHTML = html;
            } else {
                var tmp = /time=.*?;/g.exec(content);
                var time = Number(/\d+/g.exec(tmp[0])[0]);
                var tmp = /flow=.*?;/g.exec(content);
                var flow = Number(/\d+/g.exec(tmp[0])[0]) / 1024;
                var tmp = /fee=.*?;/g.exec(content);
                var fee = Number(/\d+/g.exec(tmp[0])[0]) / 10000;

                console.log("time: " + time);
                console.log("flow: " + flow);
                console.log("fee: " + fee);

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

function saveUserInfo(user_info) {
    chrome.storage.sync.set(user_info, function() {
        console.log("--->saved user_info");
    });
}

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

function updateBasicInfo(user_info) {
	// get flow information
    getFlowInfo();
    if (("id" in user_info) && ("password" in user_info)) {
        getTerminalInfo(user_info);
    }
    console.log(user_info);
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
