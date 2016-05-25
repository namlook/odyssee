
// import routes from '../../../src/routes';
//
// export default (config) => ({
//     model: 'Ingredient',
//     routes: routes(config),
// });

export const jsonApiQueryExpose = {
    fields: {
        recipe: 'recipe.title',
        isOptional: 'isOptional',
        quantity: 'quantity',
        unit: 'unit.title',
    },
    aggregate: {
        aliments: {
            $aggregator: 'array',
            $property: 'aliments.title',
        },
    },
    filter: {
        aliments: 'aliments',
        isOptional: 'isOptional',
        isRemarquable: 'isRemarquable',
        quantity: 'quantity',
        unit: 'unit.title',
    },
    sort: ['recipe', 'quantity'],
};

export const streamExpose = {
    fields: ['aliments.title', 'quantity', 'unit.title', 'isOptional'],
    filter: ['isRemarquable', 'isOptional'],
    aggregate: ['aliments.title'],
    sort: ['quantity'],
};

import { queryRoute as jsonApiQueryRoute } from '../../../src/routes/json-api';
import { queryRoute as streamQueryRoute } from '../../../src/routes/stream';

export default (/* config */) => ({
    model: 'Ingredient',
    routes: [
        jsonApiQueryRoute({ path: '/', expose: jsonApiQueryExpose }),
        streamQueryRoute({ path: '/i/stream', expose: streamExpose }),
    ],
});


// import { queryJsonApiRoute } from '../../../src/routes';
//
// export default (config) => ({
//     model: 'Recipe',
//     routes: [
//         queryJsonApiRoute({
//             query: {
//                 field: {
//                     aliments: 'aliments.title',
//                     unit: 'unit.title',
//                     quantity: 'quantity.title',
//                     isOptional: 'isOptional',
//                     recipe: 'recipe',
//                 },
//                 filter: {
//                     aliment: 'aliments.title',
//                     unit: 'unit.title',
//                     quantity: 'quantity',
//                     isOptional: 'isOptional',
//                     isRemarquable: 'isRemarquable',
//                 },
//                 sort: ['aliments.title', 'quantity', 'isOptional'],
//             },
//             // predefined: {
//             //     filter: {
//             //         isRemarquable: true, // predefined parameters
//             //     },
//             // },
//             // validation: (request, reply) {
//             //     const { query, $user } = request;
//             //     return query.author === $user.name ? reply() : reply.notAuthorized();
//             // }
//         }),
//     ],
// });
//
//
// const results = {
//     links: {
//         self: '/ingredients?page[limit]=20',
//         next: '/ingredients?page[limit]=20&page[offset]=20',
//         last: '/ingredients?page[limit]=20&page[offset]=60',
//     },
//     data: [
//         {
//             id: '678',
//             type: 'ingredients',
//             attributes: {
//                 quanity: 650,
//                 unit: 'grammes',
//                 quantity: 'quantity',
//                 isOptional: 'isOptional',
//             },
//             relationships: {
//                 recipe: {
//                     data: { id: '0123', type: 'recipes' },
//                 },
//             },
//         },
//     ],
//     included: [
//         {
//             // ... the recipe represented as a recipes resource
//         },
//     ],
// };
