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

function getCookieAndCheckcode() {
    var info = ["", ""];
	// remove the request cookie
	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		var headers = details.requestHeaders;
		var blockingResponse = {};
        console.log("in onBeforeSendHeaders: ");
        console.log(headers);
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
		console.log(details);
		details.responseHeaders.forEach(function(ele) {
			if (ele.name == "Set-Cookie") {
				var JSESSIONID = ele.value.substring(0, ele.value.indexOf(";"));
                console.log("abc");
                info[0] = JSESSIONID;
                Cookie = JSESSIONID;
				console.log("my Cookie: " + JSESSIONID);
			}
		});
		return {responseHeaders:details.responseHeaders};
	},
	{urls: ["http://gwself.bupt.edu.cn/nav_login"]},
	["responseHeaders"]);

	chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
		var headers = details.requestHeaders;
		var blockingResponse = {};
        console.log("in onBeforeSendHeaders: ");
        console.log(headers);
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


function login(info) {
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
            console.log(xhr.getAllResponseHeaders());
            console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^");
        }
    }
    pwd = calcMD5("44266");
    data = "account=2015140391&password=" + pwd + "&code=&checkcode=" + info[1] + "&Submit=%E7%99%BB+%E5%BD%95";
    xhr.send(data);
}

function tooffline(tag){//在线详单--强制离线
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

function getTerminalInfo() {
    var info = getCookieAndCheckcode();
    console.log(info);
    setTimeout(function() {
        login(info);
        console.log("after login");
        setTimeout(function() {
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
    xhr.open("GET", url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var content = xhr.responseText.replace(/(?:\r\n|\r|\n|\t|\s)/g, "");
            var tmp = /time=.*?;/g.exec(content);
            var time = Number(/\d+/g.exec(tmp[0])[0]);
            var tmp = /flow=.*?;/g.exec(content);
            var flow = Number(/\d+/g.exec(tmp[0])[0]) / 1024;
            var tmp = /fee=.*?;/g.exec(content);
            var fee = Number(/\d+/g.exec(tmp[0])[0]) / 10000;

            console.log("time: " + time);
            console.log("flow: " + flow);
            console.log("fee: " + fee);

            var ele = document.getElementById("flow");
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
    xhr.send();
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

	// get flow information
    getFlowInfo("http://10.3.8.211/");
    setInterval(function() {
        getFlowInfo("http://10.3.8.211/");
    }, 5000);

    // get terminal information
    getTerminalInfo();

}
