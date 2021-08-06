const { Client } = require('@elastic/elasticsearch')
const fs = require('fs')


const client = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: process.env.ES_PW ? process.env.ES_PW: "Dpm#1217"
  }
})

client.cluster.health({},function(err,resp,status) {
  if (err) {
    console.error(err)
  }
});

class AlgoLogger {
  /* using file name, read in algo logs and bulk upload them to elasticsearch */
  constructor(fPath, elasticsearchClient, algoUrl) {
    this.fPath = fPath;
    this.elasticsearchClient = elasticsearchClient;
    this.algoUrl= algoUrl
  }

  async parse() {
    // parse log files, split into array where each item is one line
    // return data parsed and structured for elasticsearch

    await fs.readFile(this.fPath, 'utf8', async (err, data) => {
      if (err) { console.error(err) } else {
        let unstructuredDataArr = data.split('\n');
        let structuredData = await this.structure(unstructuredDataArr);
        this.data = structuredData;

        return this.data;
      }
    })
  }

  async structure(unstructuredDataArr) {
    // structure data in log files for es
    let dataForElasticsearch = new Array()

    for (var lineNum in unstructuredDataArr) {
      const line = unstructuredDataArr[lineNum]
      const structuredLine = this._buildElasticsearchPayloadFrom(line, lineNum)
      console.log(structuredLine);
      dataForElasticsearch.push(
        structuredLine
      );
    }

    return dataForElasticsearch;
  }

  async _buildElasticsearchPayloadFrom(log, logLineNum) {
    /* for a given log line, structure it's payload */
    let keysToFetch = new Array("Context", "Hash", "Round", "Sender", "Type", "msg");
    let lineData = new Object()

    let jsonifiedLog;
    try {
      jsonifiedLog = JSON.parse(log);
    }
    catch(e) { return }

    keysToFetch.forEach( (key) => {
      lineData[key.toLowerCase()] = jsonifiedLog[key]
    })

    lineData["date"] = new Date()
    lineData["id"] = logLineNum
    return lineData
  }

  async _indiceExistsFor(indexName) {
    /* check if index `indexName` exists, return result */

    const res = await client.indices.exists({index: indexName})
    const exists = res.body

    console.log(exists);
    return exists
  }

  async _createIndex(indexName, indexMappings) {
    // create elasticsearch index
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: indexMappings
        }
      }
    }, { ignore: [400] })
  }

  async _uploadData(indexName) {

    const body = this.data.flatMap( (doc) => [{ index: { _index: indexName } }, doc])
    const { body: bulkResponse } = await client.bulk({ refresh: true, body })
    return bulkResponse
  }

  async upload(indexName, indexMappings) {
    // upload to elasticsearch
    let indexExists = await this._indiceExistsFor(indexName);

    if (!indexExists) {
      // if indice does not exist...
      console.log("index does not exist, creating it now");
      this._createIndex(indexName, indexMappings);
    }

    // index exists, we can now upload data to it.
    this._uploadData(indexName)
    let {body: { count: count } } = await client.count({ index: indexName })

    console.log(`There are ${count} total documents in index ${indexName}`);
  }

  async testIndex(indexName, queryParams) {
    const { body } = await client.search({
        index: indexName,
        body: queryParams
      })

      console.log(body.hits.hits);
  }

}

const Algo = new AlgoLogger('/Users/danielmurphy/Desktop/ELK-to-Algo/node.log', '', 'sdfgfsh');
// Algo.parse().catch(console.log);
let mappings = {
  context: {type: "text"},
  hash: {type: "text"},
  round: {type: "integer"},
  sender: {type: "text"},
  type: {type: "text"},
  msg: {type: "text"},
  date: {type: "date"},
  id: {type: "integer"}
}
// Algo.upload("algorand", mappings).catch(console.log);
Algo.testIndex("algorand",
  {
    query: {
      match: {
        type: "VoteAccepted"
      }
    }
  }).catch(console.log)
