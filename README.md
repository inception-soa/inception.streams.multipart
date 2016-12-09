# inception.streams.multipart

Creates and parses multipart form streams.

## installation

Use the following command to install the library from npm:

```bash
npm install inception.streams.multipart
```

## usage

The library exposes 2 main classes:

- `MultipartStreamer`: A Readable stream used to create multipart content
- `MultipartParser`: A Writable stream used to parse a multipart stream

### streaming multipart content

The following code show how to create a new multipart stream that can be piped into an outgoing HTTP request.

```javascript
const MultipartStreamer = require('inception.streams.multipart').MultipartStreamer;

const req = getAnInstanceOfHttpClientRequestSomehow();
const myJsonObject = { foo: 'bar' };
const myStream = node.fs.createReadStream('/etc/motd');
const streamer = new MultipartStreamer();
  .addFieldPart({ value: 'fieldValue', name: 'fieldName' })        // Form field
  .addObjectPart({ value: myJsonObject })                          // JSON object
  .addFilePart({ value: '/etc/hosts', contentType: 'text/plain' }) // File
  .addStreamPart({ value: myStream, contentType: 'text/html' });   // Node.js stream

req.headers['content-type'] = `multipart/form-data; boundary=${streamer.boundary}`;
streamer.pipe(req);
```

### parsing multipart content

The following code show how to parse an incoming multipart stream.

```javascript
const MultipartParser = require('inception.streams.multipart').MultipartParser;

function handleRequest(req, res) {
  const parser = new MultipartParser({ contentType: req.headers['content-type']});
  req.pipe(parser)
    .on('part', (part) => {
      switch(part.type) {
      case 'field':
        res.write(`name: ${part.name}, value: ${part.value}`);
        break;

      case 'object':
        res.write(JSON.stringify(part.value));
        break;

      case 'stream':
        res.write(`name: ${part.name}, contentType: ${part.contentType}`);
        part.pipe(node.fs.createWriteStream(`/var/tmp/${part.filename}`));
      }
      res.write(`Part: ${part}`);
    })
    .on('finish', () => res.end());
}
```

Alternately, one can use the `.parse()` helper method.

```javascript
const Multipart = require('inception.streams.multipart');

function handleRequest(req, res) {
  Multipart.parse(req)
  .on('part', (part) => {
    switch(part.type) {
    case 'field':
      res.write(`name: ${part.name}, value: ${part.value}`);
      break;

    case 'object':
      res.write(JSON.stringify(part.value));
      break;

    case 'stream':
      res.write(`name: ${part.name}, contentType: ${part.contentType}`);
      part.pipe(node.fs.createWriteStream(`/var/tmp/${part.filename}`));
    }
    res.write(`Part: ${part}`);
  })
  .on('finish', () => res.end());
}
```

## contact

All feedback/suggestions/criticisms can be directed to [Anand Suresh](http://www.github.com/anandsuresh)
