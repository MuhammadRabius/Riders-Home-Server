const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5myll.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
      }
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
      });
    }
    

async function run(){
       try{
            await client.connect();
            const partCollection = client.db('ridershome').collection('parts');
            const orderCollection = client.db('ridershome').collection('order');
            const userCollection = client.db('ridershome').collection('user');
            const reviewCollection = client.db('ridershome').collection('review');
            const paymentCollection = client.db('ridershome').collection('payments');
          
            const verifyAdmin = async (req, res, next) => {
          const requester = req.decoded.email;
          const requesterAccount = await userCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
            next();
          }
          else {
            res.status(403).send({ message: 'forbidden' });
          }
        }


          app.get('/parts',async(req,res)=>{
              const query={}
              const result = await partCollection.find(query).toArray();
              const reverse= result.reverse();
              console.log(reverse);
              res.send(reverse);
              
            })
          app.post('/parts',async(req,res)=>{
              const newItem = req.body;
              const result = await partCollection.insertOne(newItem);
              res.send(result);
              
            });

          app.delete('/parts/:id', async (req, res) => {
            const itemId = req.params.id;
            const query = { _id: ObjectId(itemId) };
            const result = await partCollection.deleteOne(query);
            res.send(result);
              
            });

            app.get('/parts/:partsId', async (req, res) => {
            const partsId = req.params.partsId;
            const query = {_id:ObjectId(partsId) };
            const parts = await partCollection.findOne(query);
            res.send(parts);
       })

       app.
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

        app.delete('/cancel-order/:id', async (req, res) => {
            const itemId = req.params.id;
            const query = { _id: ObjectId(itemId) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
              
            });
      //  User Put and Get
      app.put('/updateuser',async(req,res)=>{
              const user = req.body;
              const email=req.body.email;
              console.log(email)
               const filter = { email:email
              };

              const updateDoc = {
                $set: user
              };
              const options = { upsert: true };
              const result = await userCollection.updateOne(filter, updateDoc, options);
              
              res.send(result);
              
        });

        app.get('/update-user-info/:email',async(req,res)=>{
          const email=req.params.email;
          const query ={email:email};
          const result = await userCollection.findOne(query);
          res.send(result);
        })
       
        // review post and get 
        app.post('/addreview',async(req,res)=>{
              const addReview = req.body;
              const result = await reviewCollection.insertOne(addReview);
              
              res.send(result);
              
        });
        app.get('/review',async(req,res)=>{
              const query ={};
              const result =  await reviewCollection.find(query).toArray();
              const reverseResult = result.reverse();
              res.send(reverseResult);
              
        });

        //Jwt
      app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
      res.send({ result, token });
    });
// admin
      app.get('/user', verifyJWT, async (req, res) => {
        const users = await userCollection.find().toArray();
        res.send(users);
      });

      app.get('/admin/:email', async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === 'admin';
        res.send({ admin: isAdmin })
      })

      app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      console.log(filter)
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    app.delete('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    })
       
    // payment section 

    app.get('/payment-item/:id', async(req, res) =>{
      const id = req.params.id;
      console.log(id);
      const query = {_id: ObjectId(id)};
      const order = await orderCollection.findOne(query);
      console.log(order);
      res.send(order);
    });

    app.post('/create-payment-intent', async(req, res) =>{
      const paymentOrder = req.body;
      const price = paymentOrder.amount;
      const newAmount = Number(price);
      const paymentIntent = await stripe.paymentIntents.create({
        amount : newAmount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });

    app.patch('/get-payment/:id',  async(req, res) =>{
      const id  = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);

      app.get('/get-payment', async (req, res) => {
        const paymentInfo = await paymentCollection.find().toArray();
        res.send(paymentInfo);
      });
    })
// update parts
    app.put('/updateparts/:partsName', async (req, res) => {
      const name = req.params.partsName;
      const filter = { partsName: name };
      
      const updateDoc = {
       $inc: 
                   { availableQuantity: -availableQuantity } 
      };
      const result = await partCollection.updateOne(filter, updateDoc);
      res.send(result);
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