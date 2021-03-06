publish:
	@@node bin/lowkick publish test/config.json

publish-remote-server:
	@@node bin/lowkick publish test/remote-server-config.json

remote-command:
	@@node bin/lowkick command $(cmd) test/remote-client-config.json

verify:
	@@node bin/lowkick verify test/config.json

cmd:
	@@node bin/lowkick command $(cmd) test/config.json

console-ie8:
	node bin/lowkick console http://127.0.0.1:1315 ie8

console-chrome:
	node bin/lowkick console http://127.0.0.1:1315 chrome

test-ie6:
	node bin/lowkick command ie6 test/config.json

test-ie7:
	node bin/lowkick command ie7 test/config.json

test-ie8:
	node bin/lowkick command ie8 test/config.json

test-node:
	node bin/lowkick command node test/config.json
