const  express  =  require('express');
const bodyParser = require("body-parser");
const  multipart  =  require('connect-multiparty');
const  multipartMiddleware  =  multipart({ uploadDir:  './database' });

const  app  =  express()
const  port  =  3000

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app.get('/api/upload', (req, res) => {
    res.json({
        'message': 'hello'
    });
});

app.post('/api/upload', (req, res) => {
  let fs = require('fs');
  let content=JSON.stringify(req.body);

  fs.writeFile('./database/icrs.txt', content, function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
  res.json({
      'message': 'File uploaded successfully'
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
