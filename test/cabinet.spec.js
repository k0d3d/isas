describe("All Cabinet Methods", function(){
	var Media = require("../app/models/media.js");
	var Cabinet = require("../app/controllers/cabinet.js").cabinet;
	var cabinet = new Cabinet();
	var completed, result;
	var userId = "januzaj";
	beforeEach(function(){
		completed = false
	});
	it("should count the total files a user has", function(){
		runs(function(){
			cabinet.countUserFiles(userId, function(count){
				result = count;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});
		runs(function(){
			console.log("user has %s files", result);
			expect(result).toBeDefined();
		})
	});
	it("should list the files a user has uploaded", function(){
		runs(function(){
			var options = {};
			cabinet.findUserFiles(userId, options, function(r){
				result = r;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			console.log("%s completed", result.length);
			console.log(result);
			expect(result).toBeDefined();
			expect(typeof(result)).toEqual("object");
		});
	});
	it("should list the files a user has uploaded", function(){
		runs(function(){
			var options = {};
			cabinet.findUserQueue(userId, options, function(r){
				result = r;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			console.log("%s waiting", result.length);
			console.log(result);
			expect(result).toBeDefined();
			expect(typeof(result)).toEqual("object");
		});
	});	
	afterEach(function(){
		completed = false;
		result = undefined;
	});
});