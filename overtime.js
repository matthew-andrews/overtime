/*global console, window*/
/*
	README

	To be able to use this offline, add a javascript file into the manifest called 'overtimeoffsite.js' with source:-
	self.onmessage=function(e){eval(e.data);self.onmessage=null;};
 */
/**
 * Overtime.js
 * 
 * A wrapper for cross browser WebWorkers so that they can be easily run with inline javascript and may be used in an offline web app
 * 
 * @author Matthew Andrews <matthew@andrews.eu.com>
 * @param  {Function}	workFunction			The work to do, takes 1 param, a data string. Has to be able to run independently. No DOM access.
 * @param  {Function}	resultFunction			Handle the results from the work, no restrictions - normal function
 * @param  {String}		dataString				A string to pass workFunction, reccommend using JSON.stringify to pass objects
 * @param  {Boolean}	forceSynchronousBool	This is more for debug than anything else
 */
function overtime(workFunction, resultFunction, dataString, forceSynchronousBoolean) {
	'use strict';

	var debugMode = true,
		debug = function debug() {
			if (debugMode && console) {
				console.log(Array.prototype.slice.call(arguments));
			}
		},
		externalFilePath = 'overtimeoffsite.js',
		URL = window.URL || window.webkitURL,
		BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder,
		Worker = window.Worker,
		synchronousFunction = function () {
			debug("Running work synchronously");
			resultFunction(workFunction(dataString), false);
			debug("Finished running work synchronously");
		},
		innerResponse = "var o;postMessage('OVERTIMESTARTED');o=(" + workFunction.toString() + "(\"" + dataString.replace(/"/g, "\\\"") + "\"));postMessage(o);",
		response = "self.onmessage=function(){" + innerResponse + "};",
		blob,
		worker,
		recoveryTimeout;

	if (Worker && !forceSynchronousBoolean) {

		// Chrome (this is actually deprecated, but let's use it whilst we can)
		if (BlobBuilder && URL) {
			debug("Running inline Worker");
			blob = new BlobBuilder();
			blob.append(response);
			worker = new Worker(URL.createObjectURL(blob.getBlob()));

		// Safari (this also works on Chrome)
		} else {
			debug("Running sudo inline worker");
			worker = new Worker(externalFilePath);
		}

		try {
			worker.onmessage = function (e) {
				if (e.data === 'OVERTIMESTARTED') {
					debug("Started overtime, clear the recovery timeout");
					window.clearTimeout(recoveryTimeout);
				} else {
					debug("Overtime ended, terminate the worker");
					worker.terminate();
					resultFunction(e.data || undefined, true);
				}
			};
			worker.onerror = function (e) {
				worker.terminate();
				synchronousFunction();
			};

			// If after half a second the process hasn't started, cancel and run synchronously
			// This is because if there is a 404 error on the sudo inline worker, it will fail silently
			recoveryTimeout = window.setTimeout(function () {
				debug("Overtime failed, fallback to doing work synchronously");
				worker.terminate();
				synchronousFunction();
			}, 500);

			worker.postMessage((BlobBuilder && URL ? undefined : innerResponse));
		} catch (e) {
			synchronousFunction();
		}
	} else {
		synchronousFunction();
	}
}