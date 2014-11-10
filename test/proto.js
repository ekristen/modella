/**
 * Module dependencies
 */

var model = require("../"),
    expect = require('expect.js');

/**
 * Initialize `User`
 */

var User;

beforeEach(function() {
  User = model('User')
  .attr('id', { type: 'number' })
  .attr('name', { type: 'string' })
  .attr('age', { type: 'number' });

  User.prototype.throwError = function() {
    throw new Error("I shouldn't get called");
  };

  // Build in a bogus sync-layer
  User.save = function(fn) {
    fn();
  };

  User.update = function(fn) {
    fn();
  };
});

/**
 * Test proto
 */

describe('Model#changed()', function(){
  it('should return a cloned object of changed attrs', function(){
    var user = new User({ name: 'baz' });
    expect(user.changed()).to.eql({});
    user.name('foo');
    expect(user.changed()).to.eql({ name: 'foo' });
    expect(user.changed()).to.not.equal(user.dirty);
  });
});

describe('Model#changed(attr)', function(){
  it('should return a boolean if attr was changed', function(){
    var user = new User({ name: 'baz' });
    expect(user.changed('name')).to.eql(false);
    user.name('foo');
    expect(user.changed('name')).to.eql(true);
  });
});

describe('Model#<attr>(value)', function() {
  var user;

  beforeEach(function() {
    user = new User({name: 'Tobi', age: 22});
  });

  it('returns itself', function() {
    expect(user.name('Bob')).to.equal(user);
  });

  it('sets a value', function() {
    user.name('Bob');
    expect(user.name()).to.equal('Bob');
  });

  it('can unset a value', function() {
    user.age(undefined);
    expect(user.age()).to.equal(undefined);
  });

  it('emits "change:<attr>" events', function(done){
    user.on('change name', function(newVal, old) {
      expect(newVal).to.equal('Bob');
      expect(old).to.equal('Tobi');
      done();
    });

    user.name('Bob');
  });

  it('emits "change" events', function(done) {
    user.on('change', function(prop, newVal, old) {
      expect(prop).to.equal('name');
      expect(newVal).to.equal('Bob');
      expect(old).to.equal('Tobi');
      done();
    });

    user.name('Bob');
  });

  it('marks the attr as dirty', function() {
    user.name('Bob');
    expect(user.changed('name')).to.be(true);
  });

  describe('with the same value', function() {
    it("doesn't mark it as dirty", function() {
      user.name('Tobi');
      expect(user.changed('name')).to.be(false);
    });
  });
});

describe('Model#set(attrs)', function() {
  it('should set multiple attributes', function() {
    var user = new User();
    user.set({
      name : 'matt',
      age : 23
    });
    expect(user.name()).to.equal('matt');
    expect(user.age()).to.equal(23);
  });

  it('should unset values when passed as `undefined`', function() {
    var user = new User({
      name: 'Bob',
      age: 23
    });
    user.set({
      name: 'Tobi',
      age: undefined
    });
    expect(user.name()).to.equal('Tobi');
    expect(user.age()).to.equal(undefined);
  });

  it('should ignore attributes not in schema', function(){
    var user = new User();
    user.set({ omg : 'lol' });
    expect(user.omg).to.be(undefined);
  });

  it('should not call methods with the same name', function(){
    var user = new User();
    user.set({ throwError : 'lol' });
  });

  it('emits setting on the Model', function(){
    var user = new User();
    User.once('setting', function(user, attrs) {
      attrs.name = 'ryan';
    });
    user.set({ name : 'matt' });
    expect(user.name()).to.be('ryan');
  });

  it('emits setting on the instance', function(){
    var user = new User();
    user.once('setting', function(attrs) {
      attrs.name = 'ryan';
    });
    user.set({ name : 'matt' });
    expect(user.name()).to.be('ryan');
  });
});

describe('Model#isNew()', function() {
  it('defaults to true', function() {
    var user = new User();
    expect(user.isNew()).to.equal(true);
  });

  it('is false when primary key is present', function() {
    var user = new User({ id: 1 });
    expect(user.isNew()).to.equal(false);
  });
});

describe('Model#model', function() {
  it('references the constructor', function() {
    var user = new User();
    expect(user.model).to.equal(User);
  });
});

describe('Model#get(attr)', function() {
  it('returns an attr value', function() {
    var user = new User({ name: 'Tobi' });
    expect(user.get('name')).to.equal('Tobi');
  });
});

describe('Model#unset(attr)', function() {
  it('unset an attribute', function() {
    var user = new User({ name: 'Tobi' });
    user.unset('name');
    expect(user.get('name')).to.equal(undefined);
  });
});

describe('Model#has(attr)', function() {
  var user;

  beforeEach(function() {
    user = new User({ name: 'Tobi' });
  });

  it('returns true if the object has the attr', function() {
    expect(user.has('name')).to.equal(true);
  });

  it('returns false if the object doesn\'t have the attr', function() {
    var user = new User();
    expect(user.has('age')).to.equal(false);
  });
});

describe('Model#remove()', function() {
  function remove(fn) {
    return fn();
  }

  it('throws an error if it\'s new', function(done) {
    var user = new User();
    user.remove(function(err) {
      expect(err.message).to.equal('not saved');
      done();
    });
  });

  it('calls Model.remove', function(done) {
    var user = new User({id: 123});
    user.model.remove = remove;
    user.remove(done);
  });

  describe('with error', function() {
    var error = new Error('some error');

    function remove(fn) {
      return fn(error);
    }

    it('emits "error"', function(done) {
      var user = new User({ id : 123 });
      user.model.remove = remove;
      user.on('error', function(err) {
        expect(err).to.equal(error);
        done();
      });
      user.remove();
    });
  });

  describe('with success', function() {
    var user;

    function remove(fn) {
      fn();
    }

    beforeEach(function() {
      user = new User({id: 123});
      user.model.remove = remove;
    });

    it('sets removed to true', function(done) {
      user.on('remove', function() {
        expect(user.removed).to.equal(true);
        done();
      });
      user.remove();
    });

    it('emits "remove"', function(done) {
      user.on('remove', done);
      user.remove();
    });

    it('emits "removing" on model', function(done) {
      User.on('removing', function(instance) {
        expect(instance).to.be(user);
        done();
      });
      user.remove();
    });

    it('emits "removing" on instance', function(done) {
      user.on('removing', function() {
        done();
      });
      user.remove();
    });

    it('doesn\'t validate on "removing"', function(done) {
      User.validate(function(user) {
        user.error('name', 'is required');
      });

      user.on('removing', function(fn) {
        user.error('age', 'is required');
        fn();
      });

      user.remove(function(err) {
        expect(!err);
        done();
      });
    });

    it('emits "remove" on the constructor', function(done) {
      User.once('remove', function(obj) {
        expect(obj).to.equal(user);
        done();
      });
      user.remove();
    });

    it('emits "removing" on the constructor', function(done) {
      User.once('removing', function(obj) {
        expect(obj).to.equal(user);
        done();
      });
      user.remove();
    });
  });

});

describe("Model#save()", function() {
  var user;

  function save(fn) {
    fn(null, { id : '100', name : 'someguy' });
  }

  beforeEach(function() {
    user = new User();
    user.model.save = save;
  });

  it("runs validations", function (done) {
    var called = false;
    user.validate = function() {
      called = true;
    };
    user.save(function() {
      expect(called).to.be(true);
      done();
    });
  });

  describe("when valid", function() {

    it('does not destroy listeners when running them', function(done) {
      var SomeModel = model('SomeModel');
      var callCount = 0;
      SomeModel.save = function(cb) {
        cb();
      };
      SomeModel.on('creating', function(instance, done) {
        callCount++;
        done();
      });

      var a = new SomeModel(),
          b = new SomeModel();

      a.save(function() {
        b.save(function() {
          expect(callCount).to.be(2);
          done();
        });
      });

    });

    it('emits "saving" on model', function(done) {
      User.once('saving', function(obj, next) {
        expect(obj).to.equal(user);
        expect(next).to.be.a('function');
        done();
      });
      user.save();
    });

    it('emits "saving" on instance', function(done) {
      user.once('saving', function(next) {
        expect(next).to.be.a('function');
        done();
      });
      user.save();
    });

    it('emits "save" on instance', function(done) {
      user.once('saving', function() {
        done();
      });
      user.save();
    });

    it('emits "save" on the model', function(done) {
      User.once('save', function(obj) {
        expect(obj).to.equal(user);
        done();
      });
      user.save();
    });


    it('validates on saving events', function(done) {
      user.once('saving', function(next) {
        setTimeout(function() {
          user.errors.push(new Error('not valid'));
          next();
        }, 10);
      });

      user.once('saving', function(obj, fn) {
        setTimeout(function() {
          obj.errors.push(new Error('other not valid'));
          fn();
        }, 15);
      });

      user.save(function(err) {
        expect(err.message).to.equal('validation failed');
        expect(user.errors.length).to.equal(1); // run('saving') callsback on the first error
        expect(user.errors[0].message).to.equal('not valid');
        done();
      });
    });

    it('validates .validate on saving event', function(done) {
      User.validate(function(user) {
        if(!user.name()) {
          user.error('name', "is required");
        }
      });

      User.validate(function(user) {
        if(!user.age()) {
          user.error('age', "is required");
        }
      });

      User.once('saving', function(obj, fn) {
        obj.name(null);
        fn();
      });

      var user = new User({name: 'marie', age: 30});
      user.model.save = save;

      user.save(function(err) {
        expect(err.message).to.equal('validation failed');
        expect(user.errors.length).to.equal(1); // run('saving') callsback on the first error
        expect(user.errors[0].message).to.equal('is required');
        expect(user.errors[0].attr).to.equal('name');
        done();
      });
    });

    describe('creation events', function() {
      var user;
      beforeEach(function() {
        user = new User({name: 'marie', age: 30});
      });

      it('emits "creating" events on model', function(done) {
        User.once('creating', function(u) {
          expect(u).to.be(user);
          done();
        });
        user.save();
      });

      it('emits "creating" events on instance', function(done) {
        user.once('creating', function(next) {
          expect(next).to.be.a(Function);
          done();
        });
        user.save();
      });

      it('emits "create" events on model', function(done) {
        User.once('create', function(u) {
          expect(u).to.be(user);
          done();
        });
        user.save();
      });

      it('emits "create" events on instance', function(done) {
        user.once('create', done);
        user.save();
      });

      it('does not emit create events if not new', function(done) {
        var instanceCall = false, modelCall = false;

        var instanceFn = function(next) { instanceCall = true; if(next) next(); },
            modelFn = function(instance, next) { modelCall = false; if(next) next(); };

        User.once('creating', modelFn);
        User.once('create', modelFn);

        user.once('creating', instanceFn);
        user.once('create', instanceFn);

        user.primary(123);

        user.save(function() {
          expect(instanceCall).to.be(false);
          expect(modelCall).to.be(false);
          done();
        });
      });
    });

    it('updates attributes based on save response', function(done) {
      user.save(function() {
        expect(user.name()).to.equal('someguy');
        expect(user.id()).to.equal('100');
        done();
      });
    });

    it('doesn\'t update attributes if save fails', function(done) {
      user.name('dave');

      user.model.save = function(fn) {
        fn(new Error('some error'), { name : 'robbay'});
      };

      user.save(function() {
        expect(user.name()).to.equal('dave');
        done();
      });
    });

    describe('when new', function() {
      it('calls Model.save', function(done) {
        user.model.save = function(fn) { fn(); };
        user.save(done);
      });
    });

    describe("when old", function() {
      it('calls Model.update', function(done) {
        var user = new User({ id: 123, name: 'Bob' });
        user.model.update = function(fn) { fn(); };
        user.save(done);
      });
    });
  });

  describe("when invalid", function() {
    beforeEach(function() {
      user.isValid = function() { return false; };
    });

    it("should not call Model.save", function(done) {
      var called = false;
      user.model.save = function() {
        called = true;
      };

      user.save(function() {
        expect(called).to.be(false);
        done();
      });
    });

    it("should pass the error to the callback", function(done) {
      user.save(function(err) {
        expect(err.message).to.equal('validation failed');
        done();
      });
    });
  });

  describe("Model#toJSON()", function() {
    it('returns a JSON object', function() {
      var user = new User({ name: 'Tobi', age: 2 });
      var obj = user.toJSON();
      expect(obj.name).to.equal('Tobi');
      expect(obj.age).to.equal(2);
    });

    it('should support model#json() alias', function() {
      var user = new User({ name: 'Tobi', age: 2 });
      var obj = user.json();
      expect(obj.name).to.equal('Tobi');
      expect(obj.age).to.equal(2);
    })

    it('should clone, not reference the object', function() {
      var json = { name : 'matt' };
      var user = new User(json);
      json.name = 'ryan';
      var obj = user.toJSON();
      expect(obj.name).to.equal('matt');
    });

    it('should be recursive', function() {
      var Master = model('Master')
        .attr('name')
        .attr('servant')
        .attr('isLazy');
      var tobi = new User({ name: 'Tobi', age: 2 });
      var master = new Master({ name: 'Harry', servant: tobi, isLazy: true });

      var obj = master.toJSON();
      expect(obj.name).to.equal('Harry');
      expect(obj.servant.name).to.equal('Tobi');
      expect(obj.servant.age).to.equal(2);
      expect(obj.isLazy).to.equal(true);
    });

    it('should handle null values', function() {
      var Master = model('Master')
        .attr('name')
        .attr('servant');
      var tobi = new User({ name: 'Tobi', age: 2 });
      var master = new Master({ name: 'Harry', servant: tobi });
      master.servant(null);

      var obj = master.toJSON();
      expect(obj.name).to.equal('Harry');
      expect(obj.servant).to.equal(null);
    });

    it('should ignore attributes that are `undefined`', function() {
      var Master = model('Master')
        .attr('name')
        .attr('servant')
        .attr('skill');
      var tobi = new User({ name: 'Tobi', age: 2 });
      var master = new Master({ name: 'Harry', servant: tobi, skill: 'cleaning' });

      master.unset('skill');
      var obj = master.toJSON();
      expect(obj.name).to.equal('Harry');
      expect(obj.servant.name).to.equal('Tobi');
      expect(obj.servant.age).to.equal(2);
      expect(obj.skill).to.equal(undefined);
    });
  });

  describe('Model#isValid()', function() {
    var User = model('User')
      .attr('name')
      .attr('email');

    User.validate(function(user){
      if (!user.has('name')) { user.error('name', 'name is required'); }
    });

    User.validate(function(user){
      if (!user.has('email')) { user.error('email', 'email is required'); }
    });

    it('populates #errors', function() {
      user = new User();
      user.isValid();

      expect(user.errors).to.have.length(2);

      expect(user.errors[0].attr).to.equal('name');
      expect(user.errors[1].attr).to.equal('email');

      expect(user.errors[0].message).to.equal('name is required');
      expect(user.errors[1].message).to.equal('email is required');
    });

    describe('when invalid', function() {
      beforeEach(function() {
        user = new User();
      });

      it('returns false', function() {
        expect(user.isValid()).to.equal(false);
      });

      it('emits invalid on the model', function(done) {
        User.once('invalid', function(instance, errors) {
          expect(user).to.be(instance);
          expect(errors).to.be.a(Array);
          done();
        });
        user.isValid();
      });

      it('emits invalid on the instance', function(done) {
        user.once('invalid', function(errors) {
          expect(this).to.be(user);
          expect(errors).to.be.a(Array);
          done();
        });
        user.isValid();
      });

    });

    describe('when valid', function() {
      beforeEach(function() {
        user = new User({name: 'Tobi', email: 'tobi@hello.com'});
      });

      it('returns true', function() {
        expect(user.isValid()).to.equal(true);
      });

      it('emits valid on the model', function(done) {
        User.once('valid', function(instance, errors) {
          expect(user).to.be(instance);
          expect(errors).to.be(null);
          done();
        });
        user.isValid();
      });

      it('emits valid on the instance', function(done) {
        user.once('valid', function(errors) {
          expect(this).to.be(user);
          expect(errors).to.be(null);
          done();
        });
        user.isValid();
      });
    });
  });
});
