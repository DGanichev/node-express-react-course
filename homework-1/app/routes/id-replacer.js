exports.replaceId = function(entity) {
    if(entity) {
        entity.id = entity._id;
        delete (entity._id);
    }
    return entity;
};
