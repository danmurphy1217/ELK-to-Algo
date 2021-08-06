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

exports.Client = client


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
        return structuredData
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

  async upload() {
    // upload to elasticsearch

  }

}

const Algo = new AlgoLogger('/Users/danielmurphy/Desktop/ELK-to-Algo/node.log', '', 'sdfgfsh');
Algo.parse().catch(console.log);
