const express = require('express');
const mongodb = require('mongodb');
const indicative = require('indicative');
const bcrypt = require('bcrypt');
const moment = require('moment');
const router = express.Router();
const ObjectID = mongodb.ObjectID;

const error = require('./error-handler').error;
const replaceId = require('./id-replacer').replaceId;

router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.collection('recipes').find().toArray().then(items => {
        res.json(items.map(item => replaceId(item)));
    });
});

router.get('/:id', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {id: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('recipes').findOne({_id: new ObjectID(params.id)})
                .then(recipe => {
                    if (recipe) {
                        replaceId(recipe);
                        res.json(recipe);
                    } else {
                        error(req, res, 404, `Invalid recipe ID: ${params.id}`)
                    }
                });
        }).catch(err =>
        error(req, res, 404, `Invalid recipe ID: ${params.id}. Id should have 24 hexadecimal characters.`, err));
});

router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const recipe = req.body;
    indicative.validate(recipe, {
        id: 'required|regex:^[0-9a-f]{24}$',
        userId: 'required|regex:^[0-9a-f]{24}$',
        name: 'string|max:80',
        shortDescription: 'string|max:256',
        cookingTime: 'number',
        products: 'array',
        fullDescription: 'string|max:2048',
        tags: 'array',
    }).then(recipe => {
        recipe['createDate'] = moment().format('DD-MM-YYYY h:mm:ss');
        recipe['modificationDate'] = moment().format('DD-MM-YYYY h:mm:ss');
        db.collection('recipes').insertOne(recipe).then(result => {
            if (result.result.ok && result.insertedCount === 1) {
                replaceId(recipe);
                const uri = req.baseUrl + '/' + recipe._id;
                res.location(uri).status(201).json(recipe);
            }
        });
    }).catch(err => error(req, res, 400, `Invalid recipe data.`, err));
});

router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const user = req.body;
    if (params.id !== user.id) {
        error(req, res, 404, `User ID does not match.`);
    }
    indicative.validate(user, {
        id: 'required|regex:^[0-9a-f]{24}$',
        userId: 'required|regex:^[0-9a-f]{24}$',
        name: 'string|max:80',
        shortDescription: 'string|max:256',
        cookingTime: 'number',
        products: 'array',
        fullDescription: 'string|max:2048',
        tags: 'array',
    }).then(user => {
        db.collection('users').updateOne({_id: new ObjectID(user.id)}, {"$set": user})
            .then(result => {
                if (result.result.ok && result.modifiedCount === 1) {
                    res.status(200).json(user);
                }
            });
    }).catch(err => error(req, res, 400, `Invalid user data.`, err));
});

router.delete('/:id', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {id: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOneAndDelete({_id: new ObjectID(params.id)})
                .then(({value}) => {
                    if (value) {
                        res.json(value);
                    } else {
                        error(req, res, 404, `Invalid user ID: ${params.id}`)
                    }
                });
        }).catch(err => error(req, res, 404,
        `Invalid project ID: ${params.id}. Id should have 24 hexadecimal characters.`, err));
});

module.exports = router;
