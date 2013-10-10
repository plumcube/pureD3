all: stop update

update:
	@echo "******************************************************************************"
	@echo "UPDATING NPM"
	@echo "******************************************************************************"

	@if test -d $(CURDIR)/node_modules; then npm update; else npm install; fi

start: stop
	@nohup node puppetmaster.js >> logs/puppetmaster.log 2>&1 &

stop:
	@node bin/stop_server
	
help:
	@echo '>make    - Builds the system.'
	@echo
	@echo '>make update     - Update npm modules'
	@echo '                   This is safe to run at any time.
	@echo
	@echo '>make start  	- Run the server as a daemon.'
	@echo
	@echo '>make stop   	- Stop the server daemon.'
	@echo

.PHONY: update start stop help