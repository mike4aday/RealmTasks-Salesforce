/**
Dec. 29, 2016
Listens for Realm Object Server events and then updates Salesforce. NOT production ready - just a proof-of-concept!
*/

'use strict';

const Realm = require('realm');
const https = require('https');

// Realm admin token
const REALM_ADMIN_TOKEN = "ewoJI...Tg=="; // Use your own

// URL to Realm Object Server
const SERVER_URL = 'realm://127.0.0.1:9080';

// Path used by global notifier to listen for changes across all Realms that match.
const NOTIFIER_PATH = ".*/realmtasks";

// Salesforce settings
const SALESFORCE_ACCESS_TOKEN = "00D41000..."; // Use your own
const SALESFORCE_HOST = "realm_test-dev-ed.my.salesforce.com";

// Callback for Realm Object Server notifications
var change_notification_callback = function(change_event) {
    
    // Tell Salesforce about task changes
    let taskChanges = change_event.changes.Task;
    if (taskChanges !== undefined) {
    
    // TODO: Tell Salesforce about deletions
    
    // Tell Salesforce about insertions and modifications
    let realm = change_event.realm;
    let tasks = realm.objects('Task');
    let upserts = [].concat(taskChanges.insertions, taskChanges.modifications);
    for (var i = 0; i < upserts.length; i++) {
        let index = upserts[i];
        let task = tasks[index];
        if (task !== undefined) {
          upsertSalesforce(task, index);
        }
      }
    }
};

// Upsert (update or insert) to Salesforce
function upsertSalesforce(task, index) {
    var options = {
        host: SALESFORCE_HOST,
        path: '/services/data/v38.0/sobjects/Task/Realm_ID__c/' + index,
        port: 443,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SALESFORCE_ACCESS_TOKEN
        }
    };
    var req = https.request(options, function(res) {
        console.log('Status: ' + res.statusCode);
        res.setEncoding('utf8');
    });
    req.on('error', function(e) {
        console.log('\n*** Problem with request: ' + e.message);
    });
    
    // Write data to request body
    let body = {
        "Subject": task.text,
        "Description": "Created by RealmTask",
        "Status" : task.completed ? "Completed" : "In Progress"
    };
    req.write(JSON.stringify(body));
    req.end();
}

//Create the Realm admin user
var admin_user = Realm.Sync.User.adminUser(REALM_ADMIN_TOKEN);

// Register the event listener with Realm Object Server 
Realm.Sync.addListener(SERVER_URL, admin_user, NOTIFIER_PATH, 'change', change_notification_callback);

console.log('**** Listening for Realm changes across: ' + NOTIFIER_PATH);
