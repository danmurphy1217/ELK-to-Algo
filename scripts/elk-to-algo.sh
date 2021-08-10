
# get elasticsearch and kibana

wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.14.0-darwin-x86_64.tar.gz
tar xzvf elasticsearch-7.14.0-darwin-x86_64.tar.gz
tee elasticsearch-7.14.0/config/elasticsearch.yml << END
path.logs: /Users/danielmurphy/Desktop/ELK-to-Algo
network.host: 'localhost'
http.port: 9200
END

wget https://artifacts.elastic.co/downloads/kibana/kibana-7.14.0-darwin-x86_64.tar.gz
tar xzvf kibana-7.14.0-darwin-x86_64.tar.gz
tee kibana-7.14.0-darwin-x86_64/config/kibana.yml << END
server.port: 5601
server.host: 'localhost'
END

cat kibana-7.14.0-darwin-x86_64/config/kibana.yml
cat elasticsearch-7.14.0/config/elasticsearch.yml
