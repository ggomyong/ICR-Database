const compression = require('compression');
const  express  =  require('express');
const bodyParser = require("body-parser");
const  multipart  =  require('connect-multiparty');
const  multipartMiddleware  =  multipart({ uploadDir:  './database' });

const  app  =  express()
const  port  =  3000

app.use (compression())
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app.get('/api/hello', (req, res) =>{
  res.json({
      'message': 'Hello world!'
  });
});

app.get('/api/getIcr', (req, res) => {
  let fs = require('fs');
  let content=JSON.stringify(req.body);
  let id=req.query.id;

  let raw=fs.readFileSync('./database/'+id+'.icr');
  let icr=JSON.parse(raw);
  res.json(icr);
});

app.get('/api/download', (req, res) => {
    //gather all ICRs and combine it and then return it to the requestor
    let fs = require('fs');
    let list=JSON.parse(fs.readFileSync('./database/IcrMaster.icr')).members;
    let contents=[];

    for (let x=0; x<list.length; x++) {
      let id=list[x];
      if (Number(id)>0) {
        let path='./database/'+id+'.icr';
          let raw=fs.readFileSync(path)
          //console.log(raw);
          let icr=JSON.parse(raw);
          //console.log(icr);
          contents.push(icr);
      }

    }
    res.json(contents);
});

app.post('/api/bulkUpload', (req,res) =>{
  let fs = require('fs');
  let content=req.body;
  //console.log(content);
  for (let x=0; x<content.length; x++) {
    let icr=content[x];
    fs.writeFile('./database/'+icr.id+'.icr', JSON.stringify(icr), function (err) {
      if (err) throw err;
    });
  }
  res.json({
      'message': 'ICR Bulk Upload Successful'
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
      'message': 'Individual ICR Upload Successful'
  });
});

function processIcrs(icr, requests, returnable) {
  for (let reqIndex=0; reqIndex<requests.length; reqIndex++) {
    let request=requests[reqIndex];
    if (request.done && request.type!='R') continue;
    let type=request.type;
    let value=request.value;
    value=value.replace(/^/g, '');
    let subvalue=request.subvalue;
    if (subvalue=='@') subvalue='';
    let location=request.location;
    let method=request.method;
    let direction=request.direction;
    let routines=request.routines;
    let parent=request.parent;
    if (parent==undefined || parent==null) {
      parent='';
    }

    if (routines==null || routines==undefined) continue;

    for (let i=0; i<routines.length; i++) {
      if (returnable[routines[i]]==undefined || returnable[routines[i]]==null){
        returnable[routines[i]] = new Object();
      }
    }

    if (icr.type == type) {
      if (type=='G') {
        if (icr.value==undefined || icr.value==null|| icr.value==''||icr.value.length==0) icr.value=icr.file;

        if (isNaN(value)) {
          if (isNaN(icr.value) && icr.value != value && !icr.value.includes(value)) {
            continue;
          }
        }
        else {
          if (parent.length>0 && parent!=icr.file && value!=icr.file) {
            continue;
          }
          if (parent.length==0 && value!=icr.file) {
            continue;
          }
        }

        if (icr.fields!=null && icr.fields.length>0) {
          for (let field of icr.fields) {
            if (subvalue.includes('\'')){
              subvalue=subvalue.replace(/'/g, '');
            }

            if (field.value==subvalue || field.value=='*') {
              if (!isNaN(value)) {
                //if (parent==130 && icr.id==103) console.log(field);
                if (value!=field.file) {
                  continue;
                }
              }

              if (field.value!="*") {
                if (method=='Direct' && field.method == 'Fileman') break;
                if (direction == 'Write' && field.direction=='Read') break;
                if (direction == 'Read' && field.direction=='Write') break;
              }

              //hit
              for (let i=0; i<routines.length; i++) {
                if (returnable[routines[i]][icr.id]==undefined || returnable[routines[i]][icr.id]==null) {
                  returnable[routines[i]][icr.id]=' ; Reference to '+icr.value+ ' supported by ICR # '+ icr.id + ' (';
                }
                let subvalueArray= returnable[routines[i]][icr.id].split(',');
                if (!subvalueArray.includes(subvalue)) {
                  if (parent.length>0 && !isNaN(parent) && !isNaN(value) && parent==icr.file) {
                    subvalue='#'+value+'['+subvalue+']';
                  }
                  returnable[routines[i]][icr.id]+=subvalue+',';
                }
                request.done=true;
                requests[reqIndex]=request;
              }
              break;
            }
          }
        }

        if (request.done!=true && Number(subvalue)!=+subvalue) {
          if (isNaN(subvalue) && !subvalue.includes(',') && !subvalue.includes('\'')) {
            subvalue='\''+subvalue+'\'';
          }
          for (let descr of icr.description) {
            if (descr.includes(subvalue)) {
              //hit
              for (let i=0; i<routines.length; i++) {
                if (returnable[routines[i]][icr.id]==undefined || returnable[routines[i]][icr.id]==null) {
                  returnable[routines[i]][icr.id]=' ; Reference to '+icr.value+ ' supported by ICR # '+ icr.id + ' (';
                }
                if (subvalue.includes(',') && !subvalue.includes('[')) subvalue='['+subvalue+']';
                let subvalueArray= returnable[routines[i]][icr.id].split(',');
                if (!subvalueArray.includes(subvalue)) returnable[routines[i]][icr.id]+=subvalue+',';
              }
              request.done=true;
              requests[reqIndex]=request;
            }
          }
        }
      }
      else if (type=='R') {
        if (icr.value==value) {
          if (subvalue=='') {
            //hit
            request.done=true;
            requests[reqIndex]=request;
            for (let i=0; i<routines.length; i++) {
              if (returnable[routines[i]][icr.id]==undefined || returnable[routines[i]][icr.id]==null) {
                returnable[routines[i]][icr.id]=' ; Reference to '+icr.value+ ' supported by ICR # '+ icr.id+ ' (';
              }
            }
          }
          else {
            for (let tag of icr.tags) {
              if (tag.includes('(')) tag=tag.split('(')[0];
              if (tag.includes('$$')) tag=tag.split('$$')[1];
              if (tag.includes('\r'))tag=tag.split('\r')[0];
              if (tag==subvalue) {
                request.done=true;
                requests[reqIndex]=request;
                for (let i=0; i<routines.length; i++) {
                  if (returnable[routines[i]][icr.id]==undefined || returnable[routines[i]][icr.id]==null) {
                    returnable[routines[i]][icr.id]=' ; Reference to '+icr.value+ ' supported by ICR # '+ icr.id+ ' (';
                  }
                  let subvalueArray= returnable[routines[i]][icr.id].split(',');
                  if (!subvalueArray.includes(subvalue)) returnable[routines[i]][icr.id]+=subvalue+','
                }
              }
            }
          }
        }
      }
    }
    requests[reqIndex]=request;
  }
  let returnArray=[];
  returnArray.push(requests);
  returnArray.push(returnable);
  return returnArray;
}

app.post('/api/generateIcrs', (req,res)=>{
  let fs = require('fs');
  let requests;

  try {
    requests=JSON.parse(req.body.requests);
  }
  catch {
    requests=req.body.requests;
  }

  // first read all ICRs
  let list=JSON.parse(fs.readFileSync('./database/IcrMaster.icr')).members;
  let icrs=[];

  for (let x=0; x<list.length; x++) {
    let id=list[x];
    if (Number(id)>0) {
      let path='./database/'+id+'.icr';
        let raw=fs.readFileSync(path)
        //console.log(raw);
        let icr=JSON.parse(raw);
        //console.log(icr);
        icrs.push(icr);
    }
  }
  let returnable=new Object();
  let retireds=[];
  for (let icr of icrs) {
    if (icr.status.toLowerCase()=='expired') {
      retireds.push(icr);
    }
    if (icr.status.toLowerCase()=='withdrawn' || icr.status.toLowerCase()=='retired' || icr.status.toLowerCase()=='expired') continue;
    if ((icr.expires!=undefined || icr.expires!=null) && icr.expires.length>0) {
      retireds.push(icr);
      continue;
    }
    let returnArray=processIcrs(icr, requests, returnable);
    requests=returnArray[0];
    returnable=returnArray[1];
  }
  // Lower priority
  for (let retired of retireds) {
    let returnArray=processIcrs(retired, requests, returnable);
    requests=returnArray[0];
    returnable=returnArray[1];
  }

  for (let i=0; i<requests.length; i++) {
    let request=requests[i];
    if (request.done) continue;
    let routines=request.routines;
    let value=request.value;
    let subvalue=request.subvalue;
    if (isNaN(subvalue) && !subvalue.includes(',') && !subvalue.includes('\'') && request.type=='G') {
      subvalue='\''+subvalue+'\'';
    }
    for (let i=0; i<routines.length; i++) {
      if (returnable[routines[i]]["NA"+request.value]==undefined || returnable[routines[i]]["NA"+request.value]==null) {
        let fileNumber = request.value;

        if (!isNaN(fileNumber)) fileNumber='File#:'+request.value;
        returnable[routines[i]]["NA"+request.value]=' ; Reference to '+fileNumber+ ' supported by ICR # NA (';
      }
      if (subvalue.includes(',') && !subvalue.includes('[')) subvalue='['+subvalue+']';
      let subvalueArray= returnable[routines[i]]["NA"+request.value].split(',');
      if (!subvalueArray.includes(subvalue)) returnable[routines[i]]["NA"+request.value]+=subvalue+',';
    }
  }
  let reformed=new Array();

  Object.keys(returnable).sort().forEach(function(key,index) {
    reformed.push(">>"+key);
    reformed.push(" ; Documented API's and Integration Agreements");
    reformed.push(" ; -------------------------------------------");
    Object.keys(returnable[key]).forEach(function (k1,i1){
      let str=returnable[key][k1];
      if (str.slice(-1)==',') {
        str=str.slice(0,-1)+')';
        //returnable[key][k1]=str;
      }
      else if (str.slice(-1)=='(') {
        str=str.slice(0,-2);
        //returnable[key][k1]=str;
      }
      reformed.push(str);
    });
    reformed.push(" ;");
  });
  res.json(reformed);
});

app.listen(port, () => console.log(`ICR Database app listening on port ${port}!`))
