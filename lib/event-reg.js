/**
* @module lib
* */
var events = require("events");
var util = require("util");


/**
* A class that calls events in a guided manner
* It's purpose is to have functions that are processed in a certain order
* Event handler is called with the signature (pipe, data, next).
* The next callback should receive the result that should be passed to next handler
*
* Passing an error object to next causes the guide to stop and fire 'error' event
* The order of events is determined by calling the method #orderBy(event...)
* @class Event Register
* */
