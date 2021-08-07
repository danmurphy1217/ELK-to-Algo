const {
  Client
} = require('@elastic/elasticsearch');
const fetch = require('node-fetch');

class Reader {
  /**
   * reads in data, whether it be from a file or
   * an API endpoint
   */

  constructor(url, keysToFetch = null, {
    headers,
    params,
    body
  } = {}) {
    /**
     * `location` -> (String): the location to read the
     * data from
     */
    this.url = url
    this.keysToFetch = keysToFetch
    this.headers = headers;
    this.params = params
    this.body = body
  }

  async read() {
    /**
     * call the pingEndpoint helper function and return
     * Parser(this)
     */

    let response;
    response = await this._pingEndpoint(this.url)

    return new Parser(this);
  }

  async _pingEndpoint() {
    /**
     * ping `this.url` and return JSON data for top-transactions.
     */

    let json;

    try {
      let res = await fetch(this.url, {
        headers: this.headers
      })
      json = await res.json();
    } catch (err) {
      return new Error(err);
    }

    this.data = json['top-transactions'];
  }

}

class Parser {
  constructor(reader) {
    this.reader = reader
  }

  async structure() {
    /**
     * structure data in the log files for
     * elasticsearch
     * unstructuredData -> (Array): array containing raw line items
     *                                 from the log files
     */

    let dataForElasticsearch = new Array()

    for (var i in this.reader.data) {
      const line = this.reader.data[i]
      const structuredLine = await this._buildElasticsearchPayloadFrom(line, i)
      dataForElasticsearch.push(
        structuredLine
      );
    }

    this.structuredData = dataForElasticsearch;
    return new Uploader(this)
  }

  async _buildElasticsearchPayloadFrom(rawData, i) {
    /**
     * for a given log line, extract the needed data and format an Object
     *
     * rawData -> raw data from file or API endpoint
     * i -> (integer): the ID for the elasticsearch document
     *
     * returns -> (Array): cleaned line data
     */
    let keysToFetch = this.reader.keysToFetch !== null ? this.reader.keysToFetch : Object.keys(rawData['txn']);
    let structuredData = new Object()
    let jsonifiedData;

    if (typeof rawData !== 'object') {
      try {
        jsonifiedData = JSON.parse(rawData);
      } catch (e) {
        return
      } // if cannot be parsed by JSON, return (skip the line)
    } else {
      jsonifiedData = rawData;
    }

    keysToFetch.forEach((key) => {
      structuredData[key.toLowerCase()] = jsonifiedData['txn'][key]
      structuredData['sig'] = jsonifiedData['sig']
    })

    structuredData["date"] = new Date()
    structuredData["id"] = i
    return structuredData
  }


}


class Uploader {

  constructor(parser) {
    this.parser = parser;
  }

  async _indiceExistsFor(indexName) {
    /**
     * check if `indexName` exists as an elasticsearch index.
     * indexName -> (String): the name of an index
     */

    const res = await this.client.indices.exists({
      index: indexName
    })
    const exists = res.body

    return exists
  }

  async _createIndex(indexName, indexMappings) {
    /**
     * create an elasticsearch index based on `indexName` and `indexMappings`
     *
     * indexName -> (String): the name of the index to create
     * indexMappings -> (Object): the mappings of the data types for the index
     */
    await this.client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: indexMappings
        }
      }
    }, {
      ignore: [400]
    })
  }

  async _uploadData(indexName) {
    /**
     * upload data to the elasticsearch index.
     *
     * indexName -> (String): the name of the index
     */

    const body = this.parser.structuredData.flatMap((doc) => [{
      index: {
        _index: indexName
      }
    }, doc])
    const {
      body: bulkResponse
    } = await this.client.bulk({
      refresh: true,
      body
    })
    return bulkResponse
  }

  async uploadTo(client, {
    indexName,
    mappings
  }) {
    /**
     * upload data to elasticsearch
     *
     * indexName -> (String): the name of the index
     * indexMappings -> (Object): the data type mappings for the fields in the index
     */
    this.client = client;

    console.log(indexName);

    let indexExists = await this._indiceExistsFor(indexName);

    if (!indexExists) {
      // if indice does not exist...
      console.log("index does not exist, creating it now");
      this._createIndex(indexName, mappings);
    }

    // index exists, we can now upload data to it.
    await this._uploadData(indexName)
    let {
      body: {
        count: count
      }
    } = await this.client.count({
      index: indexName
    })

    console.log(`There are ${count} total documents in index ${indexName}`);
  }

  async testIndex(indexName, queryParams) {
    /**
     * helper function to test various queries on the elasticsearch index
     *
     * indexName -> (String): the name of the index
     * queryParams -> (Object): the queries used to search elasticsearch
     */
    const {
      body
    } = await this.client.search({
      index: indexName,
      body: queryParams
    })

    console.log(body.hits.hits);
  }
}

const elasticsearchClient = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: process.env.ES_PW
  }
})

let mappings = {
  arcv: {
    type: "text"
  },
  sig: {
    type: "text"
  },
  fee: {
    type: "integer"
  },
  fv: {
    type: "integer"
  },
  gen: {
    type: "text"
  },
  gh: {
    type: "text"
  },
  lv: {
    type: "integer"
  },
  note: {
    type: "text"
  },
  snd: {
    type: "text"
  },
  type: {
    type: "axfer"
  },
  xaid: {
    type: "integer"
  },
  date: {
    type: "date"
  },
  id: {
    type: "text"
  }
}

const reader = new Reader("http://127.0.0.1:8080/v2/transactions/pending", null, {
  headers: {
    "X-Algo-API-Token": process.env.TOKEN
  }
})


async function run() {
  let parser = await reader.read();
  let uploader = await parser.structure();
  console.log(uploader);
  await uploader.uploadTo(elasticsearchClient, {
    mappings: mappings,
    indexName: "algorand-final"
  })
}

run().catch(console.log)
