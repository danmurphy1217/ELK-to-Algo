const {
  Client
} = require('@elastic/elasticsearch');
const fetch = require('node-fetch');
const fs = require('fs');

class APIReader {
  /**
   * reads in data, whether it be from a file or
   * an API endpoint
   */

  constructor({
    url,
    keysToFetch
  } = '', {
    headers,
    params,
    body
  } = {}) {
    /**
     * `location` -> (String): the location to read the
     * data from
     */
    this.url = url
    this.headers = headers;
    this.params = params;
    this.body = body;
    this.keysToFetch = keysToFetch;
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

class FileReader extends APIReader {
  constructor(logPath, keysToFetch) {
    super(keysToFetch);
    this.logPath = logPath;
  }

  async read() {
    /**
     * call the pingEndpoint helper function and return
     * Parser(this)
     */

    let response = await this._readFromFile();

    return new Parser(this);
  }

  async _readFromFile() {
    /**
     * read from file, return structured data.
     */

    const data = fs.readFileSync(this.logPath, 'utf-8');
    let unstructuredDataArr = data.split('\n');
    this.data = unstructuredDataArr;

    return this.data;
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

    let keysToFetch = this.reader.keysToFetch !== undefined ? this.reader.keysToFetch : Object.keys(jsonifiedData);
    let structuredData = new Object()

    keysToFetch.forEach((key) => {
      structuredData[key.toLowerCase()] = jsonifiedData[key]
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
    let chunk = 10000;
    let i, j;

    for (i = 0, j = body.length; i < j; i += chunk) {
      let jsonData = body.slice(i, i + chunk);
      const {
        body: bulkResponse
      } = await this.client.bulk({
        refresh: true,
        body: jsonData
      })
    }

    let jsonData = body.slice(i - chunk, j);

    const {
      body: bulkResponse
    } = await this.client.bulk({
      refresh: true,
      body: jsonData
    })

    console.log(bulkResponse.items);
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

let args = process.argv;

async function run(reader, mappings) {
  let parser = await reader.read();
  let uploader = await parser.structure();
  await uploader.uploadTo(elasticsearchClient, {
    mappings: mappings,
    indexName: "algorand-final"
  })
}

let itemToRun;

if (args.includes('--file') && args[args.indexOf('--file') + 1] !== undefined) {
  itemToRun = new FileReader(args[3])
} else if (args.includes('--url') && args[args.indexOf('--url') + 1] !== undefined) {

  if (!process.env.TOKEN) {
    throw new Error("Must set TOKEN environment variable for Algorand API token.")
  }

  itemToRun = new APIReader({
    url: args[3]
  }, {
    headers: {
      "X-Algo-API-Token": process.env.TOKEN
    }
  })

} else {
  if (!args.includes('--file') && !args.includes('--url')) {
    throw new Error("Please specify `--file` or `--url` along with the appropriate mappings.")
  } else {
    if (args.includes('--file') && args[args.indexOf('--file') + 1] === undefined) {
      throw new Error("Please provide a file path.")
    } else {
      throw new Error("Please provide a url.")
    }
  }
}

if (!args.includes('--mappings') || args[args.indexOf('--mappings') + 1] === undefined) {
  throw new Error('Please specify mappings for elasticsearch.')
}

run(itemToRun, args[args.indexOf('--mappings') + 1]).catch(console.log)
