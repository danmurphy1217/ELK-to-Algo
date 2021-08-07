# Connecting Algorand Algod API Data to [Elasticsearch](https://www.elastic.co/elasticsearch/) & [Kibana](https://www.elastic.co/kibana/)

## Prerequeisites: Run an Algorand Node
It is assumed that you are already running an Algorand node, but if you are not you can send one up quickly using [quick-algo](https://github.com/danmurphy1217/algorand-quickstart). Once you are running an Algorand node, you can move onto Step One.

## Step One: Download and install [Elasticsearch](https://www.elastic.co/elasticsearch/)

First, navigate to https://www.elastic.co/downloads/elasticsearch and select which download you would like to install. Since I am working off of a Macbook, I will select MacOS

![Download Elasticsearch for MacOS](tmp/Elasticsearch-Download.gif)

After your installation completes, navigate to your downloads folder (if that's where you downloaded elasticseach to) and run the following command:

```shell
tar xzvf elasticsearch-7.14.0-darwin-x86_64.tar.gz
```

This will unzip the elasticseaerch files, allowing you to then change into the main elasticsearch directory, configure your clusters and elasticsearch nodes, and run the elasticsearch executable file.

To configure your elasticsearch app, you can change the default settings in `elasticsearch-7.14.0/config/elasticsearch.yml`. For the simplest possible configuration, you can run elasticsearch on http://localhost:9200. The configurations for this will look similar to the following:

```yaml
path.logs: /Users/danielmurphy/Desktop/ELK-to-Algo
network.host: "localhost"
http.port: 9200
```

Now, run:

```shell
./bin/elasticsearch
```

to start elasticsearch. Afterwards, open up a new terminal window and run:

```shell
curl http://localhost:9200/
```

to test the connection and make sure elasticsearch is running as expected.

## Step Two: Download and Install [Kibana](https://www.elastic.co/kibana/)

First, navigate to https://www.elastic.co/downloads/kibana and select which download you would like to install. Since I am working off of a Macbook, I will select MacOS.

![Download Kibana for MacOS](tmp/KibanaDownload.gif)

After your installation completes, navigate to your downloads folder (if that's where you downloaded elasticseach to) and run the following command:


```shell
tar xzvf kibana-7.13.4-darwin-x86_64.tar.gz
```

This will unzip the kibana files, allowing you to then change into the main kibana directory and configure your preferences for which host and port kibana should run on.

To configure kibana, change the default settings in `kibana-7.13.4-darwin-x86_64/config/kibana.yml`. For the simplest possible configuration, you can run kibana on http://localhost:5601. The configurations for this will look similar to the following:

```shell
server.port: 5601
server.host: "localhost"
```

Now, run:

```shell
./bin/kibana
```

to start elasticsearch. Afterwards, open up a new tab and navigate to `http://localhost:5601/`.

to test the connection and make sure kibana is running as expected.

## Step 3: Connecting data to Elasticsearch & Kibana

At this point, we have elasticsearch and kibana running but do not have any data in elasticsearch to visualize! Now, we will setup a pipline from the Algornad Algod API to Elasticsearch.

In `src/index.js` are three classes: `Reader`, `Parser`, and `Uploader`. `Reader`'s sole purpose is to read in data from an external API. In this specific scenario, it is best used for communicating with the Algorand Algod API. `Parser`'s sole purpose is to take the data returned from `Reader` and parse it. This parsing includes structuring the data so that it is prepared for insertion into elasticsearch. Finally, the `Uploader` class takes the structured data returned from `Parser` and send it to elasticsearch.

Once this process is complete, you have successfully populated elasticsearch with data. Afterwards, the next step is to build dashboards and other visualizations in Kibana.
