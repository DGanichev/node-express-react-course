const express = require('express');
const mongodb = require('mongodb');
const indicative = require('indicative');
const router = express.Router();
const ObjectID = mongodb.ObjectID;

const error = require('./errorHandler').error;
const replaceId = require('./replacer').replaceId;

router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.collection('projects').find().toArray().then(items => {
        res.json(items.map(item => replaceId(item)));
    });
});

router.get('/:id', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {id: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('projects').findOne({_id: new ObjectID(params.id)})
                .then(project => {
                    if (project) {
                        replaceId(project);
                        res.json(project);
                    } else {
                        error(req, res, 404, `Invalid project ID: ${params.id}`)
                    }
                });
        }).catch(err =>
        error(req, res, 404, `Invalid project ID: ${params.id}. Id should have 24 hexadecimal characters.`, err));
});

router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const project = req.body;
    indicative.validate(project, {
        id: 'required|regex:^[0-9a-f]{24}$',
        date: 'date',
        authors: 'required',
        name: 'required',
        githubUrl: 'url',
        description: 'required',
    }).then(project => {
        db.collection('projects').insertOne(project).then(result => {
            if (result.result.ok && result.insertedCount === 1) {
                replaceId(project);
                const uri = req.baseUrl + '/' + project._id;
                res.location(uri).status(201).json(project);
            }
        });
    }).catch(err => error(req, res, 400, `Invalid project data.`, err));
});

router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const article = req.body;
    if (params.id !== article.id) {
        error(req, res, 404, `Project ID does not match.`);
    }
    indicative.validate(article, {
        id: 'required|regex:^[0-9a-f]{24}$',
        date: 'date',
        authors: 'required',
        name: 'required',
        githubUrl: 'url',
        description: 'required',
    }).then(project => {
        db.collection('projects').updateOne({_id: new ObjectID(project.id)}, {"$set": project})
            .then(result => {
                if (result.result.ok && result.modifiedCount === 1) {
                    res.status(200).json(project);
                }
            });
    }).catch(err => error(req, res, 400, `Invalid project data.`, err));
});

router.delete('/:id', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {id: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('projects').findOneAndDelete({_id: new ObjectID(params.id)})
                .then(({value}) => {
                    if (value) {
                        res.json(value);
                    } else {
                        error(req, res, 404, `Invalid project ID: ${params.id}`)
                    }
                });
        }).catch(err => error(req, res, 404,
        `Invalid project ID: ${params.id}. Id should have 24 hexadecimal characters.`, err));
});

module.exports = router;
