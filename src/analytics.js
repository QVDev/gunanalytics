var peers = ['https://gunmeetingserver.herokuapp.com/gun'];
var opt = { peers: peers, localStorage: false, radisk: false };
var gun = Gun(opt);

setSessionId(gun._.opt.pid);


//Set the session storage as we dont want to sent when we reload the page
function setSessionId(pid) {
    if (sessionStorage.id == undefined) {
        sessionStorage.id = pid;
    }
}

function getSessionId() {
    return sessionStorage.id;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function analyticsEvents(hostname) {
    gun.get(hostname).map().on(function (data, key) {
        if (data.pid !== undefined && data.timestamp !== undefined) {
            console.info(JSON.stringify(data))
        }
    })
}

function analyticsTopReferals(hostname) {
    var referals = [];
    gun.get(hostname).map(function (data, key) {
        if (data.pid !== undefined && data.urlReferrer !== undefined) {
            referals.push(data.urlReferrer)
            console.log("added");
        }
    }).then()
}

function analyticsEventsWithReference(hostname, reference) {
    gun.get(hostname).map(data => data.urlReferrer === reference ? data : undefined).once(function (data, key) {
        if (data.pid !== undefined && data.timestamp !== undefined) {
            console.info(JSON.stringify(data))
        }
    })
}

function addEvent(hostname, data) {
    timestamp = Date.now();
    data.timestamp = timestamp;
    var trackData = gun.get(timestamp).put(data);
    var sessionData = gun.get(hostname).get(data.pid).set(trackData);
    gun.get(hostname).set(sessionData);
}

/* eslint-env browser */

// We use https://jscompress.com to compress our script so you can test
// if this script is indeed the same script as the minified version we
// published on https://cdn.simpleanalytics.io/hello.js

(function (window, hostname) {
    if (!window) return;

    // analyticsEvents(hostname);
    analyticsTopReferals(hostname);
    // analyticsEventsWithReference(hostname, 'indiehackers');

    // Set urls outside try block because they are needed in the catch block
    var protocol = 'https://';
    var apiUrl = protocol + hostname;
    var con = window.console;

    try {
        var nav = window.navigator;
        var loc = window.location;
        var doc = window.document;
        var userAgent = nav.userAgent;
        var dis = window.dispatchEvent;
        var lastSendUrl;
        var notSending = 'Not sending requests ';


        // A simple log function so the user knows why a request is not being send
        var warn = function (message) {
            if (con && con.warn) con.warn('Simple Analytics: ' + message);
        }

        // We do advanced bot detection in our API, but this line filters already most bots
        if (userAgent.search(/(bot|spider|crawl)/ig) > -1) return warn(notSending + 'because user agent is a robot');

        var post = function (isPushState) {
            // Obfuscate personal data in URL by dropping the search and hash
            var url = loc.protocol + '//' + loc.hostname + loc.pathname;

            // Don't send the last URL again (this could happen when pushState is used to change the URL hash or search)
            if (lastSendUrl === url) return;
            lastSendUrl = url;

            // Skip prerender requests
            if ('visibilityState' in doc && doc.visibilityState === 'prerender') return warn(notSending + 'when prerender');

            // Don't track when Do Not Track is set to true
            // if ('doNotTrack' in nav && nav.doNotTrack === '1') return warn(notSending + 'when doNotTrack is enabled');

            // Don't track when localhost
            // if (loc.hostname === 'localhost' || loc.protocol === 'file:') return warn(notSending + 'from localhost');

            // From the search we grab the utm_source and ref and save only that
            var refMatches = loc.search.match(/[?&](utm_source|source|ref)=([^?&]+)/gi);
            var refs = refMatches ? refMatches.map(function (m) { return m.split('=')[1] }) : [];

            var pid = getSessionId()
            var data = { url: url };
            if (pid) data.pid = pid;
            if (userAgent) data.ua = userAgent;
            if (refs && refs[0]) data.urlReferrer = refs[0];
            if (doc.referrer && !isPushState) data.referrer = doc.referrer;
            if (window.innerWidth) data.width = window.innerWidth;

            try {
                data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            } catch (error) {
                // nothing
            }
            //Sent the data to gun
            // con.info(JSON.stringify(data))            
            addEvent(hostname, data);

        }

        var his = window.history;
        var hisPushState = his ? his.pushState : null;
        if (hisPushState && Event && dis) {
            var stateListener = function (type) {
                var orig = his[type];
                return function () {
                    var rv = orig.apply(this, arguments);
                    var event = new Event(type);
                    event.arguments = arguments;
                    dis(event);
                    return rv;
                };
            };
            his.pushState = stateListener('pushState');
            window.addEventListener('pushState', function () {
                post(true);
            });
        }

        // When in hash mode, we record a pageview based on the onhashchange function
        if ('onhashchange' in window) {
            window.onhashchange = function () {
                post(true);
            }
        }

        post();
    } catch (e) {
        if (con && con.error) con.error(e);
        var url = apiUrl + '.gif';
        if (e && e.message) url = url + '?error=' + encodeURIComponent(e.message);
        new Image().src = url;
    }
})(window, 'livevodestream.com');