describe("v4ault methods", function(){
	var Media = require("../app/models/media.js");
	var V = require("../app/controllers/v4ult.js").v4ult;
	var v = new V();
	var fs = require("fs");
	var h = {
		progress: 1,
		filename: 'gggg.avi',
		size: 6966784,
		chunkCount: 6,
		identifier: 'gggg.avi6966784video/avi',
		type: 'video/avi',
		downloadCount: 0,
		owner: 'testsUser'
	};
	var result;
	var completed;
	beforeEach(function(){
		completed = false;
		result = {};
	});
	xit("should save and find an item", function(){
		runs(function(){
			v.save(h, function(t){
				result = t;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			expect(result).toBeDefined();
			expect(result._id).toBeDefined();
		});
	});
	xit("should find a record", function(){
		Media.findOne({owner: h.owner}, function(err, i){
			console.log("Media:: "+i);
		})
	})

	xit("should update an exisiting record", function(){
		h.progress = 2;
		runs(function(){
			v.save(h, function(t){
				result.updated = t;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			expect(result.updated).toEqual(1);
		});
	});
	it("should delete a file from the file system", function(){
		// var fileStream = fs.createWriteStream("./v4nish/tempTest.txt");
		// fileStream.once('open', function(fd){
		// 	fileStream.write("Testing Text");
		// 	fileStream.end();
		// });	
		runs(function(){			
			v.delete("test", function(r){
				result.deleted = r;
				completed = true;
			});
		});

		waitsFor(function(){
			return completed;
		});

		runs(function(){
			console.log(result);
			expect(result.deleted).toBeDefined();
		});		
	});
	afterEach(function(){
		completed = false;

	})
});