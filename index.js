const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5100;

// middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5qfz6zd.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: 'unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const toyCategoryCollection = client
      .db('toyMarketPlace')
      .collection('toyCategory');

    app.get('/total-toys', async (req, res) => {
      const result = await toyCategoryCollection.estimatedDocumentCount();
      res.send({ totalNumberOfToys: result });
    });

    // all toys....

    app.get('/gettoys', async (req, res) => {
      console.log(req.query);
      const page = parseInt(req.query.page) || 0;
      const limit = 8;
      const skip = page * limit;
      const cursor = toyCategoryCollection.find({});
      const result = await cursor.skip(skip).limit(limit).toArray();
      res.send(result);
    });

    app.post('/addtoys', async (req, res) => {
      const toy = req.body;
      // console.log(toy);
      const result = await toyCategoryCollection.insertOne(toy);
      res.send(result);
    });
    // new arived

    app.get('/gettoys-new', async (req, res) => {
      console.log(req.query);

      const cursor = toyCategoryCollection.find({});
      const result = await cursor
        .sort({ createdAt: -1 })
        .collation({ locale: 'en_US', numericOrdering: true })
        .limit(2)
        .toArray();
      res.send(result);
    });

    app.get('/gettoys-by-category', async (req, res) => {
      const { category } = req.query;
      const result = await toyCategoryCollection
        .find({ sub_category: category })
        .toArray();
      res.send(result);
    });


    // single toy update
    app.patch('/update/:id', async (req, res) => {
      const id = req.params.id;
      console.log(req.decoded);
      const email = req.decoded?.email;
      const filter = { _id: new ObjectId(id) };
      const toy = await toyCategoryCollection.findOne(filter);
      const options = { upsert: false };
      const updatedToy = req.body;
      if (email === toy['seller-email']) {
        console.log(updatedToy);
        const updateDoc = {
          $set: {
            ...updatedToy,
          },
        };
        const result = await toyCategoryCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } else {
        res.status(403).send({ error: true, message: 'unauthorized access' });
      }
    });

    // single toy get
    app.get('/gettoys/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toyCategoryCollection.findOne(query);
      res.send(result);
    });

    // single toy delete
    app.delete('/deltoys/:id',  async (req, res) => {
      const id = req.params.id;
      const { email } = req?.query;
     
      const query = { _id: new ObjectId(id) };
      const toy = await toyCategoryCollection.findOne(query);
      console.log(toy) ;
       const result = await toyCategoryCollection.deleteOne(query);
       res.send(result);
    });

    // my toys
    // :5100/my-toys?email=test@example.com&&email=test@example.com

    app.get('/getmy-toys', async (req, res) => {
      const queryStr = req.query;
      // const email = req.query.email;
      // const { email } = req.query;
      console.log(queryStr);

      // console.log(queryStr);
      // const email = req.decoded?.email;
      const query = { email: queryStr?.email };

      // const options = {
      //   // sort returned documents in ascending order by title (A->Z)
      //   sort: { price: queryStr === 'asc' ? 1 : -1 },
      //   // Include only the `title` and `imdb` fields in each returned document
      // };

      // console.log(email);
      if (queryStr) {
        const cursor = toyCategoryCollection.find(query);
        const result = await cursor
          .sort({ price: queryStr === 'asc' ? 1 : -1 })
          .collation({ locale: 'en_US', numericOrdering: true })
          .toArray();
        res.send(result);
      } else {
        const cursor = toyCategoryCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      }
    });

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('toy market server');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});