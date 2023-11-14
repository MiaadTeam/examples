import {
  ActFn,
  array,
  boolean,
  lesan,
  MongoClient,
  number,
  object,
  ObjectId,
  objectIdValidation,
  RelationDataType,
  RelationSortOrderType,
  string,
} from "/Users/syd/work/arc/lesan/mod.ts"; // Please replace `x.x.x` with the latest version in [releases](https://github.com/MiaadTeam/lesan/releases)

const coreApp = lesan();

const client = await new MongoClient("mongodb://127.0.0.1:27017/").connect();

const db = client.db("dbName"); // change dbName to the appropriate name for your project.

coreApp.odm.setDb(db);

const countryCityPure = {
  name: string(),
  population: number(),
  abb: string(),
};

const countryRelations = {};

const countries = coreApp.odm.newModel(
  "country",
  countryCityPure,
  countryRelations,
);

const cityRelations = {
  country: {
    optional: false,
    schemaName: "country",
    type: "single" as RelationDataType,
    relatedRelations: {
      cities: {
        type: "multiple" as RelationDataType,
        limit: 50,
        sort: {
          field: "_id",
          order: "desc" as RelationSortOrderType,
        },
      },
      citiesByPopulation: {
        type: "multiple" as RelationDataType,
        limit: 50,
        sort: {
          field: "population",
          order: "desc" as RelationSortOrderType,
        },
      },
      capital: {
        type: "single" as RelationDataType,
      },
    },
  },
};

const cities = coreApp.odm.newModel(
  "city",
  countryCityPure,
  cityRelations,
);

const userPure = {
  name: string(),
  age: number(),
};

const users = coreApp.odm.newModel("user", userPure, {
  livedCities: {
    optional: false,
    schemaName: "city",
    type: "multiple",
    sort: {
      field: "_id",
      order: "desc",
    },
    relatedRelations: {
      users: {
        type: "multiple",
        limit: 3,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },

  mostLovedCity: {
    optional: true,
    schemaName: "city",
    type: "single",
    relatedRelations: {
      lovedByUser: {
        type: "multiple",
        limit: 3,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
    },
  },

  livedCountry: {
    optional: false,
    schemaName: "country",
    type: "single",
    relatedRelations: {
      users: {
        type: "multiple",
        limit: 3,
        sort: {
          field: "_id",
          order: "desc",
        },
      },
      usersByAge: {
        type: "multiple",
        limit: 3,
        sort: {
          field: "age",
          order: "asc",
        },
      },
    },
  },
});

const addCountryValidator = () => {
  return object({
    set: object(countryCityPure),
    get: coreApp.schemas.selectStruct("country", 1),
  });
};

const addCountry: ActFn = async (body) => {
  const { name, population, abb } = body.details.set;
  return await countries.insertOne({
    doc: {
      name,
      population,
      abb,
    },
    projection: body.details.get,
  });
};

coreApp.acts.setAct({
  schema: "country",
  actName: "addCountry",
  validator: addCountryValidator(),
  fn: addCountry,
});

const addCityValidator = () => {
  return object({
    set: object({
      ...countryCityPure,
      country: objectIdValidation,
      isCapital: boolean(),
    }),
    get: coreApp.schemas.selectStruct("city", 1),
  });
};

const addCity: ActFn = async (body) => {
  const { country, name, population, abb, isCapital } = body.details.set;

  return await cities.insertOne({
    doc: { name, population, abb },
    projection: body.details.get,
    relations: {
      country: {
        _ids: new ObjectId(country),
        relatedRelations: {
          cities: true,
          citiesByPopulation: true,
          capital: isCapital,
        },
      },
    },
  });
};

coreApp.acts.setAct({
  schema: "city",
  actName: "addCity",
  validator: addCityValidator(),
  fn: addCity,
});

const addCityCountryValidator = () => {
  return object({
    set: object({
      city: objectIdValidation,
      country: objectIdValidation,
      isCapital: boolean(),
    }),
    get: coreApp.schemas.selectStruct("city", 1),
  });
};

const addCityCountry: ActFn = async (body) => {
  const { country, city, isCapital } = body.details.set;

  return await cities.addRelation({
    _id: new ObjectId(city),
    projection: body.details.get,
    relations: {
      country: {
        _ids: new ObjectId(country),
        relatedRelations: {
          cities: true,
          citiesByPopulation: true,
          capital: isCapital,
        },
      },
    },
    replace: true,
  });
};

coreApp.acts.setAct({
  schema: "city",
  actName: "addCityCountry",
  validator: addCityCountryValidator(),
  fn: addCityCountry,
});

const addUserValidator = () => {
  return object({
    set: object({
      ...userPure,
      livedCountry: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUser: ActFn = async (body) => {
  const { livedCountry, livedCities, name, age } = body.details.set;
  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.insertOne({
    doc: { name, age },
    projection: body.details.get,
    relations: {
      livedCountry: {
        _ids: new ObjectId(livedCountry),
        relatedRelations: {
          users: true,
          usersByAge: true,
        },
      },
      livedCities: {
        _ids: obIdLivedCities,
        relatedRelations: {
          users: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addUser",
  validator: addUserValidator(),
  fn: addUser,
});

const addUserLivedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUserLivedCity: ActFn = async (body) => {
  const { livedCities, _id } = body.details.set;
  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.addRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      livedCities: {
        _ids: obIdLivedCities,
        relatedRelations: {
          users: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addUserLivedCities",
  validator: addUserLivedCityValidator(),
  fn: addUserLivedCity,
});

const addUserCountryValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCountry: objectIdValidation,
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUserCountry: ActFn = async (body) => {
  const { livedCountry, _id } = body.details.set;

  return await users.addRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      livedCountry: {
        _ids: new ObjectId(livedCountry),
        relatedRelations: {
          users: true,
          usersByAge: true,
        },
      },
    },
    replace: true,
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addUserCountry",
  validator: addUserCountryValidator(),
  fn: addUserCountry,
});

const addUserCitiesValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addUserCities: ActFn = async (body) => {
  const { livedCities, _id } = body.details.set;
  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.addRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      livedCities: {
        _ids: obIdLivedCities,
        relatedRelations: {
          users: true,
        },
      },
    },
    replace: true,
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addUserCities",
  validator: addUserCitiesValidator(),
  fn: addUserCities,
});

const addMostLovedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      lovedCity: (objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const addMostLovedCity: ActFn = async (body) => {
  const { lovedCity, _id } = body.details.set;

  return await users.addRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      mostLovedCity: {
        _ids: new ObjectId(lovedCity),
        relatedRelations: {
          lovedByUser: true,
        },
      },
    },
    replace: true,
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "addMostLovedCity",
  validator: addMostLovedCityValidator(),
  fn: addMostLovedCity,
});

const removeMostLovedCityValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      lovedCity: (objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const removeMostLovedCity: ActFn = async (body) => {
  const { lovedCity, _id } = body.details.set;

  return await users.removeRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      mostLovedCity: {
        _ids: new ObjectId(lovedCity),
        relatedRelations: {
          lovedByUser: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "removeMostLovedCity",
  validator: removeMostLovedCityValidator(),
  fn: removeMostLovedCity,
});

const removeLivedCitiesValidator = () => {
  return object({
    set: object({
      _id: objectIdValidation,
      livedCities: array(objectIdValidation),
    }),
    get: coreApp.schemas.selectStruct("user", 1),
  });
};
const removeLivedCities: ActFn = async (body) => {
  const { livedCities, _id } = body.details.set;

  const obIdLivedCities = livedCities.map(
    (lc: string) => new ObjectId(lc),
  );

  return await users.removeRelation({
    _id: new ObjectId(_id),
    projection: body.details.get,
    relations: {
      livedCities: {
        _ids: obIdLivedCities,
        relatedRelations: {
          users: true,
        },
      },
    },
  });
};
coreApp.acts.setAct({
  schema: "user",
  actName: "removeLivedCities",
  validator: removeLivedCitiesValidator(),
  fn: removeLivedCities,
});

coreApp.runServer({ port: 1366, typeGeneration: true, playground: true });
