const express = require('express');
const mongodb = require('mongodb');
const indicative = require('indicative');
const {rule} = require('indicative');
const bcrypt = require('bcrypt');
const moment = require('moment');
const router = express.Router();
const ObjectID = mongodb.ObjectID;

const error = require('./error-handler').error;
const replaceId = require('./id-replacer').replaceId;

router.get('/', (req, res) => {
    const db = req.app.locals.db;
    db.collection('users').find().toArray().then(items => {
        res.json(items.map(item => replaceId(item)));
    });
});

router.get('/:userId', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
                .then(user => {
                    if (user) {
                        replaceId(user);
                        res.json(user);
                    } else {
                        error(req, res, 404, `Invalid user ID: ${params.userId}`)
                    }
                });
        }).catch(err =>
        error(req, res, 404, `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
});

router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const user = req.body;
    indicative.validate(user, {
        id: 'required|regex:^[0-9a-f]{24}$',
        name: 'string',
        recipes_id: 'array',
        username: 'string|alpha_numeric|max:15',
        password: [
            rule('required'),
            rule('regex', new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*_])(?=.{8,})'))
        ],
        sex: 'string|in:male,female',
        authority: 'string|in:user,admin',
        description: 'string|max:512',
        accountStatus: 'string|in:active,suspended,deactivated',
    }).then(user => {
        user['createDate'] = moment().format('DD-MM-YYYY h:mm:ss');
        user['modificationDate'] = moment().format('DD-MM-YYYY h:mm:ss');
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user['password'] = hash;
                db.collection('users').insertOne(user).then(result => {
                    if (result.result.ok && result.insertedCount === 1) {
                        replaceId(user);
                        const uri = req.baseUrl + '/' + user._id;
                        res.location(uri).status(201).json(user);
                    }
                });
            });
        });
    }).catch(err => error(req, res, 400, `Invalid user data.`, err));
});

router.put('/:userId', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const user = req.body;
    if (params.userId !== user.id) {
        error(req, res, 404, `User ID does not match.`);
    }
    indicative.validate(user, {
        id: 'required|regex:^[0-9a-f]{24}$',
        name: 'string',
        username: 'string|alpha_numeric|max:15',
        password: [
            rule('required'),
            rule('regex', new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*_])(?=.{8,})'))
        ],
        sex: 'string|in:male,female',
        authority: 'string|in:user,admin',
        description: 'string|max:512',
        accountStatus: 'string|in:active,suspended,deactivated',
    }).then(user => {
        user['modificationDate'] = moment().format('DD-MM-YYYY h:mm:ss');
        db.collection('users').updateOne({_id: new ObjectID(user.id)}, {"$set": user})
            .then(result => {
                if (result.result.ok && result.modifiedCount === 1) {
                    res.status(200).json(user);
                }
            });
    }).catch(err => error(req, res, 400, `Invalid user data.`, err));
});

router.delete('/:userId', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOneAndDelete({_id: new ObjectID(params.userId)})
                .then(({value}) => {
                    if (value) {
                        res.json(value);
                    } else {
                        error(req, res, 404, `Invalid user ID: ${params.userId}`)
                    }
                });
        }).catch(err => error(req, res, 404,
        `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
});

router.get('/:userId/recipes', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('recipes').find().toArray().then(items => {
                res.json(items.map(item => replaceId(item)));
            });
        }).catch(err => error(req, res, 404,
        `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
});

router.post('/:userId/recipes', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const recipe = req.body;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            indicative.validate(recipe, {
                id: 'required|regex:^[0-9a-f]{24}$',
                name: 'string|max:80',
                shortDescription: 'string|max:256',
                cookingTime: 'number',
                products: 'array',
                fullDescription: 'string|max:2048',
                tags: 'array',
            }).then(recipe => {
                recipe['createDate'] = moment().format('DD-MM-YYYY h:mm:ss');
                recipe['modificationDate'] = moment().format('DD-MM-YYYY h:mm:ss');
                recipe['userId'] = new ObjectID(params.userId);
                db.collection('recipes').insertOne(recipe).then(result => {
                    if (result.result.ok && result.insertedCount === 1) {
                        replaceId(recipe);
                        const uri = req.baseUrl + '/' + recipe._id;
                        res.location(uri).status(201).json(recipe);
                    }
                });
            }).catch(err => error(req, res, 400, `Invalid user ID.`, err));
        }).catch(err => error(req, res, 400, `Invalid recipe data.`, err));
});

router.get('/:userId/recipes/:recipeId', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;

    indicative.validate(params, {
        recipeId: 'required|regex:^[0-9a-f]{24}$',
        userId: 'required|regex:^[0-9a-f]{24}$'
    }).then(() => {
        db.collection('recipes').findOne({
            _id: new ObjectID(params.recipeId),
            'userId': new ObjectID(params.userId)
        }).then(recipe => {
            if (recipe) {
                replaceId(recipe);
                res.json(recipe);
            } else {
                error(req, res, 404, `Invalid recipe ID: ${params.recipeId}`)
            }
        });
    }).catch(err =>
        error(req, res, 404, `Invalid recipe or user ID. Id should have 24 hexadecimal characters.`, err));
});

router.put('/:userId/recipes/:recipeId', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const recipe = req.body;
    if (params.recipeId !== recipe.id) {
        error(req, res, 404, `Recipe ID does not match.`);
    }
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            indicative.validate(recipe, {
                id: 'required|regex:^[0-9a-f]{24}$',
                name: 'string|max:80',
                shortDescription: 'string|max:256',
                cookingTime: 'number',
                products: 'array',
                fullDescription: 'string|max:2048',
                tags: 'array'
            }).then(() => {
                recipe['modificationDate'] = moment().format('DD-MM-YYYY h:mm:ss');
                db.collection('recipes').updateOne({
                    _id: new ObjectID(recipe.id),
                    'userId': new ObjectID(params.userId)
                }, {"$set": recipe})
                    .then(result => {
                        if (result.result.ok && result.modifiedCount === 1) {
                            res.status(200).json(recipe);
                        }
                    });
            }).catch(err =>
                error(req, res, 404, `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
        }).catch(err =>
        error(req, res, 404, `Invalid recipe ID: ${params.recipeId}. Id should have 24 hexadecimal characters.`, err));
});

router.delete('/:userId/recipes/:recipeId', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    indicative.validate(params, {
        recipeId: 'required|regex:^[0-9a-f]{24}$',
        userId: 'required|regex:^[0-9a-f]{24}$'
    }).then(() => {
        db.collection('recipes').findOneAndDelete({
            _id: new ObjectID(params.recipeId),
            'userId': new ObjectID(params.userId)
        })
            .then(({value}) => {
                if (value) {
                    res.json(value);
                } else {
                    error(req, res, 404, `Invalid recipe ID: ${params.recipeId}`)
                }
            });
    }).catch(err => error(req, res, 404,
        `Invalid user or recipe ID. Id should have 24 hexadecimal characters.`, err));
});


module.exports = router;
