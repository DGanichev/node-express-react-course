const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const userRouter = require('./routes/users.routes');
//const recipeRouter = require('./routes/recipes.routes');

const port = 9000;

const app = express();

app.use(bodyParser.json());
app.use('/api/users', userRouter);
//app.use('/api/recipes', recipeRouter);

app.use( (req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res) => {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: err.error || err | {}
    });
});

const db_url = 'mongodb://localhost:27017/cooking-recipes-db';

MongoClient.connect(db_url, { useNewUrlParser: true }).then(db => {
    const dbo = db.db("cooking-recipes-db");
    app.locals.db = dbo;
    app.listen(port, err => {
        if (err) throw err;
        console.log(`Cooking Recipes API is running on port ${port}`);
    });
}).catch(err => {
    console.error("MongoDB is not available.");
    throw err;
});
