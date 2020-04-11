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

app.get('/api/download', (req, res) => {
    //gather all ICRs and combine it and then return it to the requestor
    let fs = require('fs');
    let list=JSON.parse(fs.readFileSync('./database/IcrMaster.icr')).members;
    let contents=[];

    for (let x=0; x<list.length; x++) {
      let id=list[x];
      if (Number(id)>0) {
        let path='./database/'+id+'.icr';
        if (fs.existsSync(path)) {
          let icr=JSON.parse(fs.readFileSync(path));
          contents.push(icr);
        }

      }

    }

    res.json({
        'message': contents
    });
});

app.post('/api/bulkUpload', (req,res) =>{
  let fs = require('fs');
  let content=req.body;
  //console.log(content);
  for (let x=0; x<content.length; x++) {
    let icr=content[x];
    console.log(JSON.stringify(icr));
    fs.writeFile('./database/'+icr.id+'.icr', JSON.stringify(icr), function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }
  res.json({
      'message': 'File uploaded successfully'
  });
});

app.post('/api/upload', (req, res) => {
  let fs = require('fs');
  let content=JSON.stringify(req.body);
  let id=req.body.id;

  fs.writeFileSync('./database/'+id+'.icr', content, function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
  res.json({
      'message': 'File uploaded successfully'
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
