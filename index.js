const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5myll.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
       try{
            await client.connect();
            const partCollection = client.db('ridershome').collection('parts');
            const orderCollection = client.db('ridershome').collection('order');

            app.get('/parts',async(req,res)=>{
              const query={}
              const result = await partCollection.find(query).toArray();
              res.send(result);
              
            })
            app.get('/parts/:partsId', async (req, res) => {
            const partsId = req.params.partsId;
            const query = {_id:ObjectId(partsId) };
            const parts = await partCollection.findOne(query);
            res.send(parts);
       })
      // Place a order:POST
         app.post('/placeorder',async(req,res)=>{
              const newOrder = req.body;
              const result = await orderCollection.insertOne(newOrder);
              console.log(result);
              res.send(result);
              
        });
        app.get('/userorder',async(req,res)=>{
              const email=req.query.email;
              const query={email};
              const cursor= orderCollection.find(query);
              const parts = await cursor.toArray();
              res.send(parts);
        })

       
          
      
            
            
}
    finally{

    }
}
 run().catch(console.dir)
;


app.get('/', (req, res) => {
  res.send('Hello I m form Riders Home Backend Server')
})

app.listen(port, () => {
  console.log(`Manufacture Application listening on port ${port}`)
})