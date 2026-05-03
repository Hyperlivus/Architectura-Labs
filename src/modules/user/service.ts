import dal from './dal';

const service = {
    getById: dal.getById,
    getByTagOrEmail: dal.getByEmailOrTag,
    getByTag: dal.getByTag,
    getByEmail: dal.getByEmail,
    create: dal.create,
    update: dal.update,
}

export default service;