console.log("abc");
chrome.alarms.create({periodInMinutes: 1});
console.log("efg");
chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log(alarm.scheduledTime);
});
