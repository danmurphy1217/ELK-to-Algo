download:
	chmod +x ./scripts/elk-to-algo.sh & ./scripts/elk-to-algo.sh

run_kibana:
	chmod +x ./scripts/run_kibana.sh & ./scripts/run_kibana.sh

run_elasticsearch:
	chmod +x ./scripts/run_elasticsearch.sh & ./scripts/run_elasticsearch.sh

runall: download run_kibana run_elasticsearch

clean:
	rm -rf elasticsearch-7.14.0
	rm elasticsearch-7.14.0-darwin-x86_64.tar.gz
	rm -rf kibana-7.14.0-darwin-x86_64
	rm kibana-7.14.0-darwin-x86_64.tar.gz
