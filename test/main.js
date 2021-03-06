var assert        = require('assert'),
    highkick      = require('highkick'),
    fs            = require('fs'),
    mkdirp        = require('mkdirp'),
    rimraf        = require('rimraf'),

    exec          = require('child_process').exec,
    join          = require('path').join,


    lowkick       = require('../lib/lowkick'),
    config        = lowkick.config,
    report        = lowkick.report,
    userscripts   = lowkick.userscripts,
    revision      = lowkick.revision,
    verify        = lowkick.verify,

    writeFileSync = fs.writeFileSync,
    readFileSync  = fs.readFileSync;

function init(options, callback){
  config.filename('test/tmp-config.json');
  callback();
}

function gitrev(callback){
  exec('git describe', function(error, stdout, stderr){
    !error && stderr && ( error = new Error(stderr) );
    
    if(error){
      callback(error);
      return;
    }

    callback(undefined, stdout.replace(/\s|\n/g, ''));

  });
}

function testConfig(callback){
  var cfg = config();

  assert.equal(cfg.revision, '0.0.0');

  assert.equal(cfg.server.host, 'localhost');
  assert.equal(cfg.server.port, '1315');
  
  assert.equal(cfg.environ.length, 8);
  assert.equal(cfg.environ[0], 'ie6');
  assert.equal(cfg.environ[6], 'opera');

  callback();
}

function testGetRevision(callback){
  var configdoc = config();

  revision(function(rev){
    try {
      assert.equal(rev, '0.0.0');
    } catch(assertionError){
      callback(assertionError);
      return;
    }

    revision(undefined);

    delete configdoc.revision;

    gitrev(function(error, _rev){
    
      if(error){
        callback(error);
        return;
      }

      revision(function(rev){
        try {
          assert.equal(rev, _rev);
        } catch(assertionError){
          callback(assertionError);
          return;
        }
        
        callback();
      });

    });

  });

}

function testSetRevision(callback){
  lowkick.revision('0.0.2', function(rev){
    assert.equal(rev, '0.0.2');
    lowkick.revision(undefined);
    callback();
  });
}

function testGitDescription(callback){
  gitrev(function(_error, rev){
    
    revision.gitDescription(function(error, _rev){
      if(error && error.message != _error.message) { 
        callback(error);
        return;
      }

      assert.equal(rev, _rev);
      callback();
    });
  });
}

function testPackageVersion(callback){
  var _version = JSON.parse( readFileSync('./package.json') ).version;
  revision.packageVersion(function(error, version){
    if(error) return callback(error);
    assert.equal(_version, version);
    callback();
  });
}

function testVerify(callback){
  report.doc({
    'revision':'0.0.0',
    'environ':{
      'Internet Explorer 6':true,
      'Internet Explorer 7':true,
      'Internet Explorer 8':true,
      'Internet Explorer 9':true,
      'Firefox 8':true,
      'Chrome 15':true,
      'Safari 3':true,
      'Opera 11':true
    }
  });

  revision('0.0.0');

  report.save(function(error){
    if(error) return callback(error);

    verify(function(error, results){
      if(error) return callback(error);

      try {
        assert.ok(results.ok);
        assert.ok(!results.fail);
        assert.equal(results.passed.length, 8);
        assert.equal(results.failed.length, 0);

        report.doc().revision = undefined;
      } catch(assertionError) {
        callback(assertionError);
      }

      verify(function(error, results){
        if(error) return callback(error);

        try {
          assert.ok(results.fail);
          assert.ok(!results.ok);

          assert.equal(results.passed.length, 0);
          assert.equal(results.failed.length, 0);

          report.doc().revision = '0.0.0';
          report.doc().environ['Internet Explorer 6'] = false;
        } catch(assertionError) {
          callback(assertionError);
        }

        lowkick.verify(function(error, results){
          if(error) return callback(error);

          try {
            assert.equal(results.passed.length, 7);
            assert.equal(results.failed.length, 1);

            assert.equal(results.failed[0], 'Internet Explorer 6');
            assert.ok(results.fail);
          } catch(assertionError) {
            callback(assertionError);
          }

          callback();
        });

      });
    });
    
  });

}

function testUserScripts(callback){
  var tmp = 'test/tmp';

  rimraf(tmp, {}, function(error){
    if(error) { 
      callback(error);
      return;
    }
  
    mkdirp.sync(tmp+'/1', 0755);
    mkdirp.sync(tmp+'/2', 0755);
    mkdirp.sync(tmp+'/2/3', 0755);

    writeFileSync(tmp+'/1/a.js', 'a');
    writeFileSync(tmp+'/1/b', 'b');
    writeFileSync(tmp+'/2/c', 'c');
    writeFileSync(tmp+'/2/3/d.js', 'd');
    writeFileSync(tmp+'/2/3/e.js', 'e');

    userscripts([tmp], function(error, scripts){

      if(error) {
        callback(error);
        return;
      }

      try {
        assert.arrayContent(scripts, [tmp+'/1/a.js', tmp+'/2/3/d.js', tmp+'/2/3/e.js']);
      } catch(assertionError) {
        error = assertionError;
      }

      config.filename(undefined);

      rimraf(tmp, {}, function(){
        callback(error);
      });

    });

  });

}

function testReport(callback){
  highkick({ module:require('./report'), name:'report', 'silent':true, 'ordered':true }, function(error, result){
    if(result.fail>0){
      callback(new Error('Report tests were failed.'));
      return;

    }

    callback();
  });
}

function testServer(callback){
  var server = require('./server');
  highkick({ module:server, name:'server', 'silent': true, 'ordered': true }, function(error, result){

    if(error || result.fail>0){
      lowkick.logging.error(error);
      server.end(function(){
        callback(new Error('Server tests were failed.'));
      });
      return;
    }

    report.reset(function(){
      server.end(callback);
    });
  });
}

function testRemote(callback){
  var remote = require('./remote');
  highkick({ module:remote, name:'remote', 'silent': true, 'ordered': true }, function(error, result){

    if(error || result.fail>0){
      lowkick.logging.error(error);
      remote.end(function(){
        callback(new Error('Remote tests were failed.'));
      });
      return;
    }

    report.reset(function(){
      remote.end(callback);
    });
  });
}

module.exports = {
  'init': init,
  'testConfig': testConfig,
  'testGitDescription': testGitDescription,
  'testReport': testReport,
  'testVerify': testVerify,
  'testPackageVersion': testPackageVersion,
  'testGetRevision': testGetRevision,
  'testSetRevision': testSetRevision,
  'testUserScripts': testUserScripts,
  'testServer': testServer,
  'testRemote': testRemote
}
