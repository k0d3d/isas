describe("AlphaId Test", function(){
    var Hashid = require("hashids");
    var length = 8;
    var hashid = new Hashid("bea4uty44ashes", length);
    var id = 999999999;

     
    beforeEach(function(){

    });
    it("should perform the whole alphaId shebang", function(){
        var r = hashid.encrypt(id);
        var o = hashid.decrypt(r);

        console.log(r);
        console.log(o);
        expect(r.length).toEqual(length);
        expect(o[0]).toEqual(id);
    }); 
});