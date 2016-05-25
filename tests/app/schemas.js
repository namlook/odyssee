
module.exports = {
  Book: {
    properties: {
      title: 'string',
    },
  },
  IngredientUnit: {
    properties: {
      title: 'string',
    },
  },
  RecipeType: {
    properties: {
      title: 'string',
    },
  },
  Recipe: {
    properties: {
      title: 'string',
      type: {
        type: 'array',
        items: 'RecipeType',
      },
      book: 'Book',
      pageNumber: 'number',
      duration: 'number',
      portions: 'number',
      kcalByPortion: 'number',
      proteins: 'number',
      carbohydrates: 'number',
      lipids: 'number',
    },
    inverseRelationships: {
      ingredients: {
        type: 'Ingredient',
        property: 'recipe',
        // propagateDeletion: true
      },
    },
  },
  Aliment: {
    properties: {
      title: 'string',
    },
  },
  Ingredient: {
    properties: {
      recipe: 'Recipe',
      aliments: {
        type: 'array',
        items: 'Aliment',
      },
      quantity: 'number',
      unit: 'IngredientUnit',
      isRemarquable: 'boolean',
      substitutes: {
        type: 'array',
        items: 'Aliment',
      },
      isOptional: 'boolean',
    },
  },
};
