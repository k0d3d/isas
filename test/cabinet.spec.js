describe("All Cabinet Methods", function(){
	var Media = require("../app/models/media.js");
	var Cabinet = require("../app/controllers/cabinet.js").cabinet;
	var cabinet = new Cabinet();
	var completed, result;
	var userId = "januzaj";
	beforeEach(function(){
		completed = false
	});
	xit("should count the total files a user has", function(){
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
	xit("should list the files a user has uploaded", function(){
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
	xit("should list the files a user has queued", function(){
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
	it("should move a file to trash", function(){
		runs(function(){
			var options = {};
			var obj = {
				fileId : "52640dbc4d7e471a08000001",
				identifier : "6966784-ggggavi"
			}
			cabinet.deleteFileRecord(obj, function(r){
				result = r;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			//console.log("%s waiting", result.length);
			console.log(result);
			expect(result).toBeDefined();
			//expect(typeof(result)).toEqual("object");
		});		
	});

	afterEach(function(){
		//completed = false;
		//result = undefined;
	});
});