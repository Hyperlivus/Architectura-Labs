import { userCommands, userQueries } from './dal';

const service = {
    // CQRS-style explicit separation
    queries: userQueries,
    commands: userCommands,

    // Backward-compatible aliases
    getById: userQueries.getById,
    getByTagOrEmail: userQueries.getByEmailOrTag,
    getByTag: userQueries.getByTag,
    getByEmail: userQueries.getByEmail,
    create: userCommands.create,
    update: userCommands.update,
};

export default service;