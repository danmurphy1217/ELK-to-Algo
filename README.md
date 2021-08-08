# Algorand-To-ELK

This project provides three base classes, `Reader`, `Parser`, and `Uploader`. They work together to retrieve Algorand data from the `Algod` API, strucutre it for elasticsearch, and upload it to elasticsearch. This process allows for a great amount of customization; you can explicitly state which values you want to extract from the `Algod` API response, map these values to specific data types in elasticsearch, create different index names, upload different endpoint data to different indices, and even read in data from log files (as opposed to using the API). You can use this pipeline tool along with CRON jobs to upload data every N seconds/minutes/etc., which will allow you to build out robust time-series visualiszations in Kibana. Furthermore, the ability to read in log data from your node(s) allows for historical error analysis (along with other more complex analyses).

On a basic level, any `Algorand-to-Elasticsearch` pipeline will follow the following four basic steps:

1. Create an Elasticsearch client:
  ```javascript
  const elasticsearchClient = new Client({
    node: 'http://localhost:9200',
    auth: {
      username: 'elastic',
      password: process.env.ES_PW
    }
  })
  ```
  Note: You'll need to run `EXPORT ES_PW='[MY_ELASTIC_SEARCH_PASSWORD]'` if you follow this template. Otherwise, you can explicitly type out your password. To setup passwords for elasticsearch users, see `elasticsearch-setup-passwords` (https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-passwords.html)
2. Define the mappings for the data you are sending to Elasticsearch. This ensures that Elasticsearch interprets your data as the correct data types. In this example, since I am sending the signature (`sig`), fee (`fee`), note (`note`), sender (`snd`), type (`type`), date (`date`), and ID (`id`) fields to Elasticsearch, I need to explicity define what data types they are:
  ```javascript
  let mappings = {
    sig: {
      type: "text"
    },
    fee: {
      type: "integer"
    },
    note: {
      type: "text"
    },
    snd: {
      type: "text"
    },
    type: {
      type: "text"
    },
    date: {
      type: "date"
    },
    id: {
      type: "text"
    }
  }
  ```

3. Create a `Reader` object. All you need to pass is the endpoint of the API to ping along with any necessary headers, the body of the request, and params. Additionally, you can pass values for `keysToFetch`, which will tell the `Parser` object which keys to extract from the root level of the data returned from the API request. If you do not pass an Array to `keysToFetch`, we automatically extract all root-level keys.
  ```javascript
  const reader = new Reader("http://127.0.0.1:8080/v2/transactions/pending", {
    headers: {
      "X-Algo-API-Token": process.env.TOKEN
    }
  })
  ```
  Note: You can retrieve your Algorand API Token in the `algod.token` of the `data` folder where you are running your Algorand node. If you are using a third-party service to run your node, they should supply you with an API token.

4. Lastly, you can run your script and upload data to Elasticsearch:
  ```javascript
  async function run() {
    let parser = await reader.read(); // returns a parser object
    let uploader = await parser.structure(); // returns an uploader object
    console.log(uploader);

    await uploader.uploadTo(elasticsearchClient, {
      mappings: mappings, // mappings for the index
      indexName: "algorand-final" // name of the index
    })
  }

  run().catch(console.log)
  ```

After this, you can navigate to http://localhost:5601 (or whichever port you are running kibana on) and explore your data.
