
// import routes from '../../../src/routes';
//
// export default (config) => ({
//     model: 'Recipe',
//     routes: routes(config),
// });


import streamRoute from '../../../src/routes/stream';
import { queryRoute as jsonApiQueryRoute } from '../../../src/routes/json-api';
import { jsonApiQueryExpose as jsonApiQueryExposeIngredient } from './ingredients';

export default (/* config */) => (
  {
    model: 'Recipe',
    routes: [
      streamRoute({
        path: '/i/stream',
        expose: {
          fields: ['title', 'pageNumber', 'ingredients.quantity', 'book.title'],
          filter: ['lipids'],
          aggregate: ['ingredients'],
          sort: ['lipids', 'title'],
        },
      }),
      jsonApiQueryRoute({
        path: '/',
        expose: {
          fields: {
            title: 'title',
            lipids: 'lipids',
            book: 'book',
          },
          aggregate: {
            ingredients: {
              $aggregator: 'array',
              $property: 'ingredients',
            },
            sumQuantity: {
              $aggregator: 'sum',
              $property: 'ingredients.quantity',
            },
          },
          filter: {
            book: 'book.title',
            title: 'title',
            lipids: 'lipids',
          },
          sort: ['lipids', 'title'],
          included: {
            ingredients: jsonApiQueryExposeIngredient,
            books: {
              fields: {
                title: 'title',
              },
            },
          },
        },
      }),
    ],
  }
);


// import { queryJsonApiRoute } from '../../../src/routes';
// export default (/* config */) => ({
//     model: 'Recipe',
//     routes: [
//         queryJsonApiRoute({
//             path: '/',
//             expose: {
//                 fields: {
//                     title: 'title',
//                     lipids: 'lipids',
//                     book: 'book',
//                 },
//                 aggregate: {
//                     ingredients: {
//                         $aggregator: 'array',
//                         $property: 'ingredients',
//                     },
//                     sumQuantity: {
//                         $aggregator: 'sum',
//                         $property: 'ingredients.quantity',
//                     },
//                 },
//                 filter: {
//                     book: 'book.title',
//                     title: 'title',
//                     lipids: 'lipids',
//                 },
//                 sort: ['lipids', 'title'],
//             },
//         }),
//     ],
// });


// import { queryJsonApiRoute } from '../../../src/routes';
//
// /** RULES
// *  - pas de d'inverseRelationships dans field
// * on le liste à la rigueur dans relationships du jsonapi avec un lien
// *  - on include les autres resources ainsi que les relations présents dans un array
// *  - on utilise les resources pour représenter les fields à retourner
// */
//
// export default (config) => ({
//     model: 'Recipe',
//     routes: [
//         queryJsonRoute({
//             path: '/',
//             query: {
//                 field: {
//                     title: 'title',
//                     book: 'book.title',
//                     // ingredients: { // its an array of relations or inverseRelationships
//                     //     property: 'ingredients',
//                     //     field: {
//                     //         aliment: 'aliments.title',
//                     //         unit: 'unit.title',
//                     //         quantity: 'quantity',
//                     //         isOptional: 'isOptional',
//                     //     },
//                     //     filter: {
//                     //         // no need
//                     //     },
//                     //     limit: 10,
//                     //     sort: ['-quantity', 'aliment'],
//                     // },
//                 },
//             },
//         }),
//
//         queryJsonApiRoute({
//             field: {
//                 title: 'title',
//                 lipids: 'lipids',
//                 book: 'book', // will raise an error if there is no "books" resource
//                 page: 'page',
//                 ingredients: 'ingredients',
//             },
//             filter: { // filter a recipe
//                 title: 'title',
//                 lipids: 'lipids',
//                 // book: 'book.title',
//                 book: 'book', // use the books resource to find how to filter
//                 ingredients: 'ingredients',
//             },
//             sort: ['title', 'lipids'],
//         }),
//     ],
// });
//
// /* this will produce : */
//
// const results = {
//     links: {
//         self: '/recipes',
//         prev: null,
//         next: '/recipes?page[offset]=2',
//         last: '/recipes?page[offset]=10',
//     },
//     meta: {
//         count: 1023,
//     },
//     data: [
//         {
//             id: '123',
//             type: 'recipes',
//             attributes: {
//                 title: 'Mousse au chocolat',
//                 page: 12,
//                 lipids: 102,
//                 // book: 'A table avec Thermomix', // if "book.title" was set instead of "book"
//             },
//             relationships: {
//                 book: {
//                     links: { self: '/recipes/123/relationships/book' },
//                     data: { id: '0123', type: 'books' },
//                 },
//                 ingredients: {
//                     link: {
//                         self: '/recipes/123/relationships/ingredients',
//                         relations: '/ingredients?filter[recipe]=123',
//                     },
//                 },
//             },
//         },
//     ],
//     included: [
//         {
//             id: '0123',
//             type: 'books',
//             links: { self: '/books/0123' },
//             attributes: {
//                 title: 'A table avec Thermomix',
//                 author: { id: 'vanderleek', type: 'authors' },
//             },
//         },
//         {
//             id: 'vanderleek',
//             type: 'authors',
//             links: { self: '/authors/vanderleek' },
//             attributes: {
//                 name: 'Van der Leek',
//                 isRegistered: true,
//             },
//         },
//     ],
// };
