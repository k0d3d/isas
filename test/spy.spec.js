var Klass = function () {
};

Klass.staticMethod = function (arg) {
  return arg;
};

Klass.prototype.method = function (arg) {
  return arg;
};

Klass.prototype.methodWithCallback = function (callback) {
  return callback('foo');
};

//...

describe("spy behavior", function() {
  beforeEach(function(){
    var l = new Klass();
    console.log(Klass.staticMethod('staticMethod'));
    console.log(l.method('method'));
  });
  it('should spy on a static method of Klass', function() {
    //spyOn(Klass, 'staticMethod');
    //Klass.staticMethod('foo argument');

    //expect(Klass.staticMethod).toHaveBeenCalledWith('foo argument');
  });

  xit('should spy on an instance method of a Klass', function() {
    var obj = new Klass();
    spyOn(obj, 'method');
    obj.method('foo argument');

    expect(obj.method).toHaveBeenCalledWith('foo argument');

    var obj2 = new Klass();
    spyOn(obj2, 'method');
    expect(obj2.method).not.toHaveBeenCalled();
  });

  xit('should spy on Klass#methodWithCallback', function() {
    var callback = jasmine.createSpy();
    new Klass().methodWithCallback(callback);

    expect(callback).toHaveBeenCalledWith('foo');
  });
});