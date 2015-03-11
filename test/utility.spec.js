

describe("Utility Tests", function(){
	var Utility =  require('../lib/utility.js');
	var utility = new Utility();
	var uuid;

	beforeEach(function(){
		//spyOn(utility, 'uuid');
		uuid = utility.uuid();
	});

	it("should return uuid", function(){
		//expect(utility.uuid).toHaveBeenCalled();
		expect(uuid).toBeDefined();
		expect(uuid.length).toBeGreaterThan(0);
		//console.log(utility.uuid());
	});

	xit("should test the cleanIdentifier method", function(){
		var g = '5757-9564%%9<>88';
		console.log(utility.cleanIdentifier(g));
	});

	it("should generate a valid mediaNumber", function(){
		var k = utility.mediaNumber();
		console.log(k);
		expect(k).toBeDefined();
		expect(k).toBeGreaterThan(0);
	});
});